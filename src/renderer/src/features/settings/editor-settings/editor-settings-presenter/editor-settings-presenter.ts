import { DEFAULT_EDITOR_PREFS, EDITOR_FONT_SIZE, EDITOR_TAB_SIZE, type EditorPrefs } from "@shared/editor"
import type { EditorSettingsStore } from "@/features/settings/editor-settings/editor-settings-store/editor-settings-store"
import type { API } from "@/ipc/api"
import { errorText } from "@/lib/format"
import type { Log } from "@/log/log"
import type { MetaStore } from "@/mirror/meta-store/meta-store"

export class EditorSettingsPresenter {
  constructor(
    private readonly store: EditorSettingsStore,
    private readonly api: API,
    private readonly metaStore: MetaStore,
    private readonly log: Log,
  ) {}

  handleFontSize = (value: number) => this.update("font-size", { fontSize: this.clamp(value, EDITOR_FONT_SIZE) })

  handleTabSize = (value: number) => this.update("tab-size", { tabSize: this.clamp(value, EDITOR_TAB_SIZE) })

  handleWordWrap = (wordWrap: boolean) => this.update("word-wrap", { wordWrap })

  handleMinimap = (minimap: boolean) => this.update("minimap", { minimap })

  handleTogglePack = (id: string) => {
    const { packs } = this.prefs()
    return this.update("toggle-pack", { packs: packs.includes(id) ? packs.filter((existing) => existing !== id) : [...packs, id] })
  }

  private prefs = (): EditorPrefs => this.metaStore.meta?.editor ?? DEFAULT_EDITOR_PREFS

  // A blank or half typed number arrives as NaN; it keeps the stored value instead of saving junk.
  private clamp = (value: number, range: { min: number; max: number }): number => {
    if (!Number.isFinite(value)) {
      return Number.NaN
    }
    return Math.min(range.max, Math.max(range.min, Math.round(value)))
  }

  private update = async (action: string, change: Partial<EditorPrefs>) => {
    if (Object.values(change).some((value) => typeof value === "number" && Number.isNaN(value))) {
      return
    }
    this.log.action(`set-${action}`, change)
    this.store.setError(null)
    try {
      await this.api.setEditorPrefs({ ...this.prefs(), ...change })
    } catch (error) {
      this.log.warn("set-editor-prefs-failed", { action, error })
      this.store.setError(errorText(error))
    }
  }
}
