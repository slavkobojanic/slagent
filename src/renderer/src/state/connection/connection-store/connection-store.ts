import { makeAutoObservable } from "mobx"
import type { WsStatus } from "@shared/ws-client"
import { addressLabel, addressLabelWith, type ServerAddress } from "@/lib/server-address"

export class ConnectionStore {
  status: WsStatus = "connecting"
  // Whether the socket has opened since launch: before that a drop is a
  // server that cannot be reached, after it a server that went away.
  reached = false
  // Nicknames keyed by "host:port", so a person's name for a Mac beats its hostname.
  nicknames: Record<string, string> = {}
  // Whether the rename box on the connected Mac's card is open.
  renaming = false
  // The nickname being typed in the rename box.
  draftNickname = ""

  constructor(readonly address: ServerAddress) {
    makeAutoObservable(this)
  }

  get label(): string {
    return addressLabelWith(this.address, this.nicknames)
  }

  get online(): boolean {
    if (this.status !== "open") {
      return false
    }
    return true
  }

  get plainLabel(): string {
    return addressLabel(this.address)
  }

  setStatus(status: WsStatus) {
    this.status = status
    if (status === "open") {
      this.reached = true
    }
  }

  setNicknames(nicknames: Record<string, string>) {
    this.nicknames = nicknames
  }

  setRenaming(renaming: boolean) {
    this.renaming = renaming
    if (renaming) {
      this.draftNickname = this.nicknames[`${this.address.host}:${this.address.port}`] ?? ""
    }
  }

  setDraftNickname(draftNickname: string) {
    this.draftNickname = draftNickname
  }
}
