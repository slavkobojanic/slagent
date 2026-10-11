import { compareStructural } from "mobx"
import { DEFAULT_EDITOR_PREFS, type EditorExtensionPayload, type EditorPrefs } from "@shared/editor"
import type { FileView } from "@shared/types"
import type { EditorEvents, EditorHandle, EditorRuntime, EditorViewOptions, LoadEditorRuntime } from "@/features/editor/editor-runtime"
import type { EditorStore } from "@/features/editor/editor-store/editor-store"
import type { CloseChoice } from "@/features/editor/editor-types"
import type { API } from "@/ipc/api"
import { editorTheme } from "@/lib/monaco/editor-theme"
import type { Log } from "@/log/log"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { LayoutStore } from "@/state/layout/layout-store/layout-store"
import type { ThemeStore } from "@/state/theme/theme-store/theme-store"

const errorText = (error: unknown): string => (error instanceof Error ? error.message : String(error))

export class EditorPresenter {
  private started = false
  private disposers: Array<() => void> = []
  private runtime: Promise<EditorRuntime> | null = null
  private handle: EditorHandle | null = null
  private host: HTMLElement | null = null
  // Paths whose models already exist in the runtime. They outlive the widget, so a remount only re-shows them.
  private readonly opened = new Set<string>()

  constructor(
    private readonly store: EditorStore,
    private readonly api: API,
    private readonly themeStore: ThemeStore,
    private readonly metaStore: MetaStore,
    private readonly layoutStore: LayoutStore,
    private readonly window: Window,
    private readonly loadRuntime: LoadEditorRuntime,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.started) {
      return
    }
    this.started = true
    this.disposers = [
      this.log.reaction("theme", () => this.themeStore.resolved, this.applyTheme),
      this.log.reaction("prefs", () => this.prefs(), this.applyPrefs, { equals: compareStructural }),
    ]
  }

  stop = () => {
    for (const dispose of this.disposers) {
      dispose()
    }
    this.disposers = []
    this.handle?.dispose()
    this.handle = null
    this.host = null
    this.started = false
  }

  // A callback ref: the view hands over its host element once it mounts, and null when it goes.
  attachHost = (element: HTMLElement | null) => {
    if (element === this.host) {
      return
    }
    this.handle?.dispose()
    this.handle = null
    this.host = element
    if (element === null) {
      return
    }
    void this.mount(element)
  }

  openFile = (file: FileView) => {
    if (file.binary || file.truncated) {
      this.log.debug("open-refused", { path: file.path, binary: file.binary, truncated: file.truncated })
      this.store.setNotice(file.binary ? `${file.path} is a binary file.` : `${file.path} is too large to edit.`)
      this.layoutStore.setEditorMode(true)
      return
    }
    this.log.action("open-file", { path: file.path })
    if (this.store.tab(file.absolutePath) === null) {
      this.store.addTab(file)
    }
    this.store.setActive(file.absolutePath)
    this.layoutStore.setEditorMode(true)
    this.sync()
  }

  selectTab = (absolutePath: string) => {
    if (this.store.tab(absolutePath) === null) {
      return
    }
    this.log.action("select-tab", { path: absolutePath })
    this.store.setActive(absolutePath)
    this.sync()
  }

  closeTab = (absolutePath: string) => {
    const tab = this.store.tab(absolutePath)
    if (tab === null) {
      return
    }
    if (tab.dirty) {
      this.store.setClosing(absolutePath)
      return
    }
    this.log.action("close-tab", { path: absolutePath })
    this.discard(absolutePath)
  }

  answerClose = async (choice: CloseChoice) => {
    const path = this.store.closing
    if (path === null) {
      return
    }
    this.log.action("answer-close", { path, choice })
    if (choice === "cancel") {
      this.store.setClosing(null)
      return
    }
    if (choice === "save") {
      await this.save(path)
      if (this.store.tab(path)?.dirty) {
        return
      }
    }
    this.discard(path)
  }

  save = async (absolutePath: string, force = false) => {
    const tab = this.store.tab(absolutePath)
    const contents = this.handle?.read(absolutePath) ?? null
    if (tab === null || tab.saving || contents === null) {
      return
    }
    this.log.action("save", { path: tab.path, force })
    // Overwriting accepts the mtime found on disk during the conflict.
    const expected = force && tab.conflictMtime !== null ? tab.conflictMtime : tab.mtime
    this.store.setSaving(absolutePath, true)
    try {
      const result = await this.log.span("write-file", () => this.api.writeFile(absolutePath, contents, expected), { path: tab.path })
      if (result.ok) {
        this.store.setSaved(absolutePath, contents, result.mtime)
        // Typing during the save leaves the tab dirty against what just landed.
        this.handleChange(absolutePath)
        return
      }
      if (result.reason === "conflict") {
        this.store.setConflict(absolutePath, result.mtime ?? null)
        return
      }
      this.store.setTabError(absolutePath, result.message)
    } catch (error) {
      this.log.warn("save-failed", { path: tab.path, error })
      this.store.setTabError(absolutePath, errorText(error))
    } finally {
      this.store.setSaving(absolutePath, false)
    }
  }

  overwrite = (absolutePath: string) => this.save(absolutePath, true)

  overwriteActive = async () => {
    const path = this.store.activePath
    if (path !== null) {
      await this.overwrite(path)
    }
  }

  reloadActive = async () => {
    const path = this.store.activePath
    if (path !== null) {
      await this.reloadFromDisk(path)
    }
  }

  reloadFromDisk = async (absolutePath: string) => {
    if (this.store.tab(absolutePath) === null) {
      return
    }
    this.log.action("reload-from-disk", { path: absolutePath })
    try {
      const file = await this.api.readFile(absolutePath)
      if (file === null || file.binary || file.truncated) {
        this.store.setTabError(absolutePath, "The file can no longer be read as text.")
        return
      }
      // Saved first, so the replace below is not mistaken for an edit.
      this.store.setSaved(absolutePath, file.contents, file.mtime)
      this.handle?.replace(absolutePath, file.contents)
    } catch (error) {
      this.log.warn("reload-failed", { path: absolutePath, error })
      this.store.setTabError(absolutePath, errorText(error))
    }
  }

  dismissNotice = () => {
    this.store.setNotice(null)
    const active = this.store.activePath
    if (active !== null) {
      this.store.setTabError(active, null)
    }
  }

  exit = () => {
    this.log.action("exit")
    this.layoutStore.setEditorMode(false)
  }

  private discard = (absolutePath: string) => {
    this.handle?.close(absolutePath)
    this.opened.delete(absolutePath)
    this.store.removeTab(absolutePath)
    this.sync()
  }

  private handleChange = (path: string) => {
    const tab = this.store.tab(path)
    const contents = this.handle?.read(path) ?? null
    if (tab === null || contents === null) {
      return
    }
    this.store.setDirty(path, contents !== tab.savedContents)
  }

  private readonly events: EditorEvents = {
    onChange: this.handleChange,
    onSave: (path) => {
      void this.save(path)
    },
    onClose: (path) => this.closeTab(path),
  }

  private sync = () => {
    const handle = this.handle
    if (handle === null) {
      return
    }
    for (const tab of this.store.tabs) {
      if (this.opened.has(tab.absolutePath)) {
        continue
      }
      handle.open(tab.absolutePath, tab.savedContents)
      this.opened.add(tab.absolutePath)
    }
    if (this.store.activePath !== null) {
      handle.show(this.store.activePath)
      handle.focus()
    }
  }

  private mount = async (element: HTMLElement) => {
    this.store.setStatus("loading")
    let runtime: EditorRuntime
    try {
      runtime = await this.ensureRuntime()
    } catch (error) {
      this.log.warn("runtime-failed", { error })
      this.store.setStatus("failed", errorText(error))
      return
    }
    // The view may have gone while the runtime loaded.
    if (this.host !== element) {
      return
    }
    this.handle = runtime.mount(element, this.events, this.viewOptions())
    this.store.setStatus("ready")
    this.sync()
  }

  private ensureRuntime = (): Promise<EditorRuntime> => {
    if (this.runtime === null) {
      this.runtime = this.boot().catch((error: unknown) => {
        // A failed load can be retried by the next mount.
        this.runtime = null
        throw error
      })
    }
    return this.runtime
  }

  private boot = async (): Promise<EditorRuntime> => {
    const runtime = await this.log.span("load-runtime", this.loadRuntime)
    await runtime.loadPacks(this.prefs().packs)
    await this.setTheme(runtime)
    await this.syncExtensions(runtime)
    return runtime
  }

  private prefs = (): EditorPrefs => {
    return this.metaStore.meta?.editor ?? DEFAULT_EDITOR_PREFS
  }

  private readToken = (token: string): string => {
    const styles = this.window.getComputedStyle(this.window.document.documentElement)
    return styles.getPropertyValue(token).trim()
  }

  private viewOptions = (): EditorViewOptions => {
    const { fontSize, tabSize, wordWrap, minimap } = this.prefs()
    return { fontSize, tabSize, wordWrap, minimap, fontFamily: this.readToken("--font-mono") }
  }

  private setTheme = (runtime: EditorRuntime): Promise<void> => {
    const mode = this.themeStore.resolved
    return runtime.setTheme(mode, JSON.stringify(editorTheme(mode, this.readToken)))
  }

  // The theme presenter flips the html class in its own reaction, so the tokens are read a frame later.
  private syncExtensions = async (runtime: EditorRuntime) => {
    const payloads: EditorExtensionPayload[] = []
    for (const extension of this.prefs().extensions) {
      if (!extension.enabled) {
        continue
      }
      try {
        const payload = await this.api.readEditorExtension(extension.id)
        if (payload !== null) {
          payloads.push(payload)
        }
      } catch (error) {
        this.log.warn("read-extension-failed", { id: extension.id, error })
      }
    }
    for (const failure of await runtime.setExtensions(payloads)) {
      this.log.warn("extension-failed", failure)
    }
  }

  private applyTheme = () => {
    const pending = this.runtime
    if (pending === null) {
      return
    }
    this.window.requestAnimationFrame(() => {
      void pending.then((runtime) => this.setTheme(runtime)).catch((error: unknown) => this.log.warn("theme-failed", { error }))
    })
  }

  private applyPrefs = () => {
    const pending = this.runtime
    if (pending === null) {
      return
    }
    void pending
      .then(async (runtime) => {
        runtime.setOptions(this.viewOptions())
        await runtime.loadPacks(this.prefs().packs)
        await this.syncExtensions(runtime)
      })
      .catch((error: unknown) => this.log.warn("prefs-failed", { error }))
  }
}
