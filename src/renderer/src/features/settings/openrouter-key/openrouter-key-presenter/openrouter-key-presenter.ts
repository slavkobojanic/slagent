import { reaction } from "mobx"
import { toast } from "sonner"
import type { OpenRouterKeyStore } from "@/features/settings/openrouter-key/openrouter-key-store/openrouter-key-store"
import type { SettingsStore } from "@/features/settings/settings-store/settings-store"
import type { AppService } from "@/ipc/app-service/app-service"
import type { SettingsService } from "@/ipc/settings-service/settings-service"
import { errorText } from "@/lib/format"
import type { OverlayStore } from "@/state/overlay-store"

const KEYS_URL = "https://openrouter.ai/keys"

export class OpenRouterKeyPresenter {
  private disposeShown: (() => void) | null = null

  constructor(
    private readonly store: OpenRouterKeyStore,
    private readonly settings: Pick<SettingsService, "saveOpenRouterKey" | "logoutOpenRouter">,
    private readonly app: Pick<AppService, "openExternal">,
    private readonly overlay: Pick<OverlayStore, "settingsOpen">,
    private readonly tabs: Pick<SettingsStore, "tab">,
  ) {}

  // Each time the general section is shown, the form starts empty.
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
    void this.app.openExternal(KEYS_URL)
  }

  handleSave = async () => {
    if (!this.store.canSave) {
      return
    }

    this.store.setError(null)
    this.store.setSaving(true)
    try {
      // The server trims the key too. The configured state arrives with the meta event, so it is not set here.
      await this.settings.saveOpenRouterKey(this.store.apiKey.trim())
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
      await this.settings.logoutOpenRouter()
      toast.success("OpenRouter credential removed")
    } catch (error) {
      this.store.setError(errorText(error))
    } finally {
      this.store.setRemoving(false)
    }
  }

  private shown = () => this.overlay.settingsOpen && this.tabs.tab === "general"
}
