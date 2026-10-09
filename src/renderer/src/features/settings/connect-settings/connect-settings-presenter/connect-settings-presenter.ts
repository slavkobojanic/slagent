import { toast } from "sonner"
import type { DaemonStatus } from "@shared/types"
import type { API } from "@/ipc/api"
import { errorText } from "@/lib/format"
import type { Log } from "@/log/log"
import type { ConnectSettingsStore } from "@/features/settings/connect-settings/connect-settings-store/connect-settings-store"

export class ConnectSettingsPresenter {
  constructor(
    private readonly store: ConnectSettingsStore,
    private readonly api: API,
    private readonly log: Log,
  ) {}

  start = () => {
    void this.loadStatus()
  }

  handleCopy = async (text: string): Promise<void> => {
    if (!text) return
    this.log.action("copy-connect-url")
    await navigator.clipboard.writeText(text).catch((error) => {
      this.log.warn("copy-failed", { error })
    })
    toast.success("Connection address copied")
  }

  handleEnable = async (): Promise<void> => {
    if (!this.store.canEnable) return
    await this.run("enable", () => this.api.enableDaemon(), "Background daemon installed. It takes over when you quit the app.")
  }

  handleDisable = async (): Promise<void> => {
    if (!this.store.canDisable) return
    await this.run("disable", () => this.api.disableDaemon(), "Background daemon removed")
  }

  private loadStatus = async () => {
    try {
      this.store.setDaemon(await this.api.daemonStatus())
    } catch (error) {
      this.log.warn("daemon-status-failed", { error })
    }
  }

  private run = async (action: "enable" | "disable", call: () => Promise<DaemonStatus>, message: string) => {
    this.store.setBusy(true)
    this.store.setError(null)
    try {
      this.store.setDaemon(await call())
      toast.success(message)
    } catch (error) {
      this.log.warn(`${action}-daemon-failed`, { error })
      this.store.setError(errorText(error))
    } finally {
      this.store.setBusy(false)
    }
  }
}
