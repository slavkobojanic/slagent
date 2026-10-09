import { makeAutoObservable } from "mobx"
import type { DaemonStatus, ServerInfo } from "@shared/types"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import { qrShape, type QrShape } from "@/lib/qr"
import { connectLink } from "@/lib/server-address"

export class ConnectSettingsStore {
  daemon: DaemonStatus | null = null
  busy = false
  error: string | null = null

  constructor(private readonly metaStore: MetaStore) {
    makeAutoObservable(this)
  }

  get server(): ServerInfo | null {
    return this.metaStore.meta?.server ?? null
  }

  // The phone's camera opens this link in the slagent iOS app, which connects to it.
  get qr(): QrShape | null {
    const server = this.server
    if (server === null || !server.tailscale) {
      return null
    }
    return qrShape(connectLink(server))
  }

  get canEnable(): boolean {
    return !this.busy && this.daemon?.installed === false
  }

  get canDisable(): boolean {
    return !this.busy && this.daemon?.installed === true
  }

  setDaemon(status: DaemonStatus) {
    this.daemon = status
  }

  setBusy(value: boolean) {
    this.busy = value
  }

  setError(message: string | null) {
    this.error = message
  }
}
