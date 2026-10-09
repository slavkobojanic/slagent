import { makeAutoObservable } from "mobx"
import type { ServerAddress } from "@/lib/server-address"

export class SavedServersStore {
  servers: ServerAddress[] = []

  constructor() {
    makeAutoObservable(this)
  }

  // The saved machines beyond the one the phone is connected to right now,
  // when it is connected at all.
  others(address: ServerAddress | null): ServerAddress[] {
    if (address === null) {
      return this.servers
    }
    return this.servers.filter((saved) => saved.host !== address.host || saved.port !== address.port)
  }

  setServers(servers: ServerAddress[]) {
    this.servers = servers
  }
}
