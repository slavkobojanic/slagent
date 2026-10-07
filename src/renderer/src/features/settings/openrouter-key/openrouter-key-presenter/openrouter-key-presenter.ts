import { reaction } from "mobx"
import { toast } from "sonner"
import type { OpenRouterKeyStore } from "@/features/settings/openrouter-key/openrouter-key-store/openrouter-key-store"
import type { SettingsStore } from "@/features/settings/settings-store/settings-store"
import type { API } from "@/ipc/api"
import { errorText } from "@/lib/format"
import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"

const KEYS_URL = "https://openrouter.ai/keys"

export class OpenRouterKeyPresenter {
  private disposeShown: (() => void) | null = null

  constructor(
    private readonly store: OpenRouterKeyStore,
    private readonly api: API,
    private readonly overlayStore: OverlayStore,
    private readonly settingsStore: SettingsStore,
  ) {}

  // The form starts empty each time the general section is shown, as the legacy form did on mount.
  start = () => {
    if (this.disposeShown !== null) {
      return
    }
    this.disposeShown = reaction(
      () => this.shown(),
      (shown) => {
        if (shown) {
          this.store.reset()
        }
      },
    )
  }

  stop = () => {
    this.disposeShown?.()
    this.disposeShown = null
  }

  handleApiKeyChange = (value: string) => {
    this.store.setApiKey(value)
  }

  handleToggleVisible = () => {
    this.store.toggleVisible()
  }

  handleCreateKey = () => {
    void this.api.openExternal(KEYS_URL)
  }

  handleSave = async () => {
    if (!this.store.canSave) {
      return
    }

    this.store.setError(null)
    this.store.setSaving(true)
    try {
      // The server trims the key too. The configured state arrives with the meta event, so it is not set here.
      await this.api.saveOpenRouterKey(this.store.apiKey.trim())
      this.store.clear()
      toast.success("OpenRouter key saved")
    } catch (error) {
      this.store.setError(errorText(error))
    } finally {
      this.store.setSaving(false)
    }
  }

  handleRemove = async () => {
    if (this.store.removing) {
      return
    }

    this.store.setError(null)
    this.store.setRemoving(true)
    try {
      await this.api.logoutOpenRouter()
      toast.success("OpenRouter credential removed")
    } catch (error) {
      this.store.setError(errorText(error))
    } finally {
      this.store.setRemoving(false)
    }
  }

  private shown = () => this.overlayStore.settingsOpen && this.settingsStore.tab === "general"
}
