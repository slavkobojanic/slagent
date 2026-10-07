import { toast } from "sonner"
import { EMPTY_PERSONALISATION, type Personalisation } from "@shared/types"
import type { PersonalisationSettingsStore } from "@/features/settings/personalisation-settings/personalisation-settings-store/personalisation-settings-store"
import type { SettingsStore } from "@/features/settings/settings-store/settings-store"
import type { API } from "@/ipc/api"
import { errorText } from "@/lib/format"
import type { Log } from "@/log/log"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"

export class PersonalisationSettingsPresenter {
  private disposeShown: (() => void) | null = null

  constructor(
    private readonly store: PersonalisationSettingsStore,
    private readonly api: API,
    private readonly metaStore: MetaStore,
    private readonly overlayStore: OverlayStore,
    private readonly settingsStore: SettingsStore,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.disposeShown !== null) {
      return
    }
    this.disposeShown = this.log.reaction(
      "shown",
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
    this.log.action("save", { draft: this.store.draft })

    this.store.setError(null)
    this.store.setSaving(true)
    try {
      await this.api.setPersonalisation(this.store.draft)
      toast.success("Personalisation saved")
    } catch (error) {
      this.log.warn("save-failed", { error })
      this.store.setError(errorText(error))
    } finally {
      this.store.setSaving(false)
    }
  }

  private saved = (): Personalisation => this.metaStore.meta?.personalisation ?? EMPTY_PERSONALISATION

  private shown = () => this.overlayStore.settingsOpen && this.settingsStore.tab === "personalisation"
}
