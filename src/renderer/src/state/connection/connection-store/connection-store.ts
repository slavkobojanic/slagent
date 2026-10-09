import { makeAutoObservable } from "mobx"
import type { WsStatus } from "@shared/ws-client"
import { addressLabel, type ServerAddress } from "@/lib/server-address"

export class ConnectionStore {
  status: WsStatus = "connecting"
  // Whether the socket has opened since launch: before that a drop is a
  // server that cannot be reached, after it a server that went away.
  reached = false

  constructor(readonly address: ServerAddress) {
    makeAutoObservable(this)
  }

  get label(): string {
    return addressLabel(this.address)
  }

  get online(): boolean {
    if (this.status !== "open") {
      return false
    }
    return true
  }

  setStatus(status: WsStatus) {
    this.status = status
    if (status === "open") {
      this.reached = true
    }
  }
}
