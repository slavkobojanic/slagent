import type { FileView } from "@shared/types"
import type { EditorStore } from "@/features/editor/editor-store/editor-store"
import type { API } from "@/ipc/api"
import { EDITOR_FRAME_CSS } from "@/lib/editor-frame-css"
import type { EditorFont } from "@/lib/editor-fonts"
import { workbenchTheme } from "@/lib/editor-theme"
import { errorText } from "@/lib/format"
import type { Log } from "@/log/log"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { LayoutStore } from "@/state/layout/layout-store/layout-store"
import type { ThemeStore } from "@/state/theme/theme-store/theme-store"

export class EditorPresenter {
  private started = false
  private disposers: Array<() => void> = []
  private frame: HTMLIFrameElement | null = null
  private loading: Promise<void> | null = null

  constructor(
    private readonly store: EditorStore,
    private readonly api: API,
    private readonly themeStore: ThemeStore,
    private readonly metaStore: MetaStore,
    private readonly layoutStore: LayoutStore,
    private readonly window: Window,
    private readonly loadFonts: () => Promise<EditorFont[]>,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.started) {
      return
    }
    this.started = true
    this.window.addEventListener("message", this.handleMessage)
    this.disposers = [
      // The editor server runs only while editor mode is open, and the page is per project.
      this.log.reaction("root", this.rootKey, this.handleRootChange, { fireImmediately: true }),
      this.log.reaction("theme", () => this.themeStore.resolved, this.applyTheme),
      () => this.window.removeEventListener("message", this.handleMessage),
    ]
  }

  stop = () => {
    for (const dispose of this.disposers) {
      dispose()
    }
    this.disposers = []
    this.started = false
  }

  // A callback ref for the frame that shows the workbench.
  attachFrame = (element: HTMLIFrameElement | null) => {
    this.frame = element
  }

  handleFrameLoad = () => {
    this.store.setReady()
  }

  openFile = async (file: FileView) => {
    this.log.action("open-file", { path: file.path })
    this.layoutStore.setEditorMode(true)
    await this.ensureUrl()
    if (this.store.url === null) {
      return
    }
    try {
      await this.api.openEditorFile(file.line ? `${file.absolutePath}:${file.line}` : file.absolutePath)
    } catch (error) {
      this.log.warn("open-file-failed", { path: file.path, error })
    }
  }

  runCommand = async (id: string) => {
    this.log.action("run-command", { id })
    try {
      await this.api.runEditorCommand(id)
    } catch (error) {
      this.log.warn("command-failed", { id, error })
    }
  }

  exit = () => {
    this.log.action("exit")
    this.layoutStore.setEditorMode(false)
  }

  retry = () => {
    this.log.action("retry")
    this.store.reset()
    void this.ensureUrl()
  }

  private rootKey = (): string => (this.layoutStore.editorMode ? (this.metaStore.meta?.cwd ?? "") : "")

  private handleRootChange = (cwd: string) => {
    this.store.reset()
    if (cwd !== "") {
      void this.ensureUrl()
    }
  }

  private ensureUrl = (): Promise<void> => {
    if (this.store.url !== null) {
      return Promise.resolve()
    }
    this.loading ??= this.loadUrl().finally(() => {
      this.loading = null
    })
    return this.loading
  }

  private loadUrl = async () => {
    this.store.setLoading()
    try {
      this.store.setUrl(await this.api.getEditorUrl())
    } catch (error) {
      this.log.warn("start-failed", { error })
      this.store.setFailed(errorText(error))
    }
  }

  // The frame announces itself once its page runs, then gets our shape CSS and theme.
  private handleMessage = (event: MessageEvent) => {
    const frame = this.frame
    if (frame === null || event.source !== frame.contentWindow || event.data?.type !== "slagent-ready") {
      return
    }
    this.postCss()
    void this.postFonts()
    this.pushTheme()
  }

  private postCss = () => {
    const url = this.store.url
    if (url === null) {
      return
    }
    this.frame?.contentWindow?.postMessage({ type: "slagent-css", css: EDITOR_FRAME_CSS }, new URL(url).origin)
  }

  private postFonts = async () => {
    const url = this.store.url
    if (url === null) {
      return
    }
    try {
      for (const font of await this.loadFonts()) {
        // The bytes move to the frame instead of being copied.
        this.frame?.contentWindow?.postMessage({ type: "slagent-font", family: font.family, weight: font.weight, data: font.data }, new URL(url).origin, [font.data])
      }
    } catch (error) {
      this.log.warn("fonts-failed", { error })
    }
  }

  private readToken = (token: string): string => {
    const styles = this.window.getComputedStyle(this.window.document.documentElement)
    return styles.getPropertyValue(token).trim()
  }

  private pushTheme = () => {
    // The editor uses the app's monospace font, which the frame is sent in postFonts.
    const values = { ...workbenchTheme(this.themeStore.resolved, this.readToken), "editor.fontFamily": this.readToken("--font-mono") }
    this.api.setEditorTheme(values).catch((error: unknown) => {
      this.log.warn("theme-failed", { error })
    })
  }

  // The theme presenter flips the html class in its own reaction, so tokens are read a frame later.
  private applyTheme = () => {
    if (this.store.url === null) {
      return
    }
    this.window.requestAnimationFrame(this.pushTheme)
  }
}
