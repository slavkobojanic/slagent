import { reaction } from "mobx"
import { toast } from "sonner"
import { EMPTY_PERSONALISATION, type Personalisation } from "@shared/types"
import type { PersonalisationSettingsStore } from "@/features/settings/personalisation-settings/personalisation-settings-store/personalisation-settings-store"
import type { SettingsStore } from "@/features/settings/settings-store/settings-store"
import type { SettingsService } from "@/ipc/settings-service/settings-service"
import { errorText } from "@/lib/format"
import type { MetaStore } from "@/mirror/meta-store"
import type { OverlayStore } from "@/state/overlay-store"

export class PersonalisationSettingsPresenter {
  private disposeShown: (() => void) | null = null

  constructor(
    private readonly store: PersonalisationSettingsStore,
    private readonly meta: Pick<MetaStore, "meta">,
    private readonly settings: Pick<SettingsService, "setPersonalisation">,
    private readonly overlay: Pick<OverlayStore, "settingsOpen">,
    private readonly tabs: Pick<SettingsStore, "tab">,
  ) {}

  // Each time the personalisation section is shown, the draft starts from the saved settings.
  start = () => {
    if (this.disposeShown !== null) {
      return
    }
    this.disposeShown = reaction(
      () => this.shown(),
      (shown) => {
        if (shown) {
          this.store.reset(this.saved())
        }
      },
    )
  }

  stop = () => {
    this.disposeShown?.()
    this.disposeShown = null
  }

  handlePatch = (next: Partial<Personalisation>) => {
    this.store.patch(next)
  }

  handleSave = async () => {
    if (!this.store.canSave(this.saved())) {
      return
    }

    this.store.setError(null)
    this.store.setSaving(true)
    try {
      await this.settings.setPersonalisation(this.store.draft)
      toast.success("Personalisation saved")
    } catch (error) {
      this.store.setError(errorText(error))
    } finally {
      this.store.setSaving(false)
    }
  }

  private saved = (): Personalisation => this.meta.meta?.personalisation ?? EMPTY_PERSONALISATION

  private shown = () => this.overlay.settingsOpen && this.tabs.tab === "personalisation"
}
