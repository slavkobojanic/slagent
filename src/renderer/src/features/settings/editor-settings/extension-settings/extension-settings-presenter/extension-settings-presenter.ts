import { DEFAULT_EDITOR_PREFS, VIM_EXTENSION_ID, type EditorPrefs } from "@shared/editor"
import type { ExtensionSettingsStore } from "@/features/settings/editor-settings/extension-settings/extension-settings-store/extension-settings-store"
import type { API } from "@/ipc/api"
import { errorText } from "@/lib/format"
import type { Log } from "@/log/log"
import type { MetaStore } from "@/mirror/meta-store/meta-store"

const same = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase()

export class ExtensionSettingsPresenter {
  constructor(
    private readonly store: ExtensionSettingsStore,
    private readonly api: API,
    private readonly metaStore: MetaStore,
    private readonly log: Log,
  ) {}

  handleQuery = (query: string) => {
    this.store.setQuery(query)
  }

  handleSearch = async () => {
    if (!this.store.canSearch) {
      return
    }
    this.log.action("search-extensions", { query: this.store.query })
    this.store.setError(null)
    this.store.setSearching(true)
    try {
      this.store.setResults(await this.api.searchEditorExtensions(this.store.query))
    } catch (error) {
      this.log.warn("search-failed", { error })
      this.store.setError(errorText(error))
    } finally {
      this.store.setSearching(false)
    }
  }

  handleInstall = (id: string) => this.install(id)

  handleUninstall = async (id: string) => {
    this.log.action("uninstall-extension", { id })
    await this.run(id, () => this.api.uninstallEditorExtension(id))
  }

  handleToggle = async (id: string) => {
    const prefs = this.prefs()
    const extensions = prefs.extensions.map((extension) => (same(extension.id, id) ? { ...extension, enabled: !extension.enabled } : extension))
    this.log.action("toggle-extension", { id })
    await this.run(id, () => this.api.setEditorPrefs({ ...prefs, extensions }))
  }

  // Vim is a regular Open VSX extension: the first switch on installs it, later ones just enable it.
  handleVim = async (on: boolean) => {
    const installed = this.prefs().extensions.some((extension) => same(extension.id, VIM_EXTENSION_ID))
    this.log.action("set-vim", { on, installed })
    if (!installed) {
      if (on) {
        await this.install(VIM_EXTENSION_ID)
      }
      return
    }
    const prefs = this.prefs()
    const extensions = prefs.extensions.map((extension) => (same(extension.id, VIM_EXTENSION_ID) ? { ...extension, enabled: on } : extension))
    await this.run(VIM_EXTENSION_ID, () => this.api.setEditorPrefs({ ...prefs, extensions }))
  }

  private prefs = (): EditorPrefs => this.metaStore.meta?.editor ?? DEFAULT_EDITOR_PREFS

  private install = async (id: string) => {
    this.log.action("install-extension", { id })
    await this.run(id, () => this.api.installEditorExtension(id))
  }

  private run = async (id: string, work: () => Promise<void>) => {
    this.store.setError(null)
    this.store.startBusy(id)
    try {
      await work()
    } catch (error) {
      this.log.warn("extension-action-failed", { id, error })
      this.store.setError(errorText(error))
    } finally {
      this.store.endBusy(id)
    }
  }
}
