import { reaction } from "mobx"
import { toast } from "sonner"
import type { CliStatus } from "@shared/types"
import type { SettingsStore } from "@/features/settings/settings-store/settings-store"
import type { CliAction, CliSettingsStore } from "@/features/settings/cli-settings/cli-settings-store/cli-settings-store"
import type { API } from "@/ipc/api"
import { errorText } from "@/lib/format"
import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"

export class CliSettingsPresenter {
  private disposeShown: (() => void) | null = null

  constructor(
    private readonly store: CliSettingsStore,
    private readonly api: API,
    private readonly overlayStore: OverlayStore,
    private readonly settingsStore: SettingsStore,
  ) {}

  start = () => {
    if (this.disposeShown !== null) {
      return
    }
    this.disposeShown = reaction(
      () => this.shown(),
      (shown) => {
        if (shown) {
          this.store.reset()
          void this.loadStatus()
        }
      },
    )
  }

  stop = () => {
    this.disposeShown?.()
    this.disposeShown = null
  }

  handleInstall = async () => {
    if (!this.store.canInstall) {
      return
    }
    await this.run("install", () => this.api.installCli(), "slagent command installed")
  }

  handleUninstall = async () => {
    if (!this.store.canUninstall) {
      return
    }
    await this.run("uninstall", () => this.api.uninstallCli(), "slagent command removed")
  }

  private shown = () => this.overlayStore.settingsOpen && this.settingsStore.tab === "cli"

  private loadStatus = async () => {
    this.store.setError(null)
    try {
      this.store.setStatus(await this.api.cliStatus())
    } catch (error) {
      this.store.setError(errorText(error))
    }
  }

  private run = async (action: CliAction, call: () => Promise<CliStatus>, message: string) => {
    this.store.setBusy(action)
    this.store.setError(null)
    try {
      this.store.setStatus(await call())
      toast.success(message)
    } catch (error) {
      this.store.setError(errorText(error))
    } finally {
      this.store.setBusy(null)
    }
  }
}
