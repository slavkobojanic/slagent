import { makeAutoObservable } from "mobx"
import type { ServerAddress } from "@/lib/server-address"

// The state behind the computer picker under the chats title: whether its
// dropdown is open, and every Mac this phone has connected to.
export class MacPickerStore {
  open = false
  servers: ServerAddress[] = []

  constructor() {
    makeAutoObservable(this)
  }

  setOpen(open: boolean) {
    this.open = open
  }

  setServers(servers: ServerAddress[]) {
    this.servers = servers
  }
}
