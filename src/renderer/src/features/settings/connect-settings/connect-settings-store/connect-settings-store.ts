import { makeAutoObservable } from "mobx"
import type { ServerInfo } from "@shared/types"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import { qrShape, type QrShape } from "@/lib/qr"
import { connectLink } from "@/lib/server-address"

export class ConnectSettingsStore {
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
}
