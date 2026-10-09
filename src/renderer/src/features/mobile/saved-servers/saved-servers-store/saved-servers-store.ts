import { makeAutoObservable } from "mobx"
import type { ServerAddress } from "@/lib/server-address"

export class SavedServersStore {
  servers: ServerAddress[] = []
  // Nicknames keyed by "host:port", shown instead of each Mac's hostname.
  nicknames: Record<string, string> = {}
  // Which row's rename box is open, keyed like the nicknames, and its draft.
  editing: string | null = null
  draft = ""

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

  setNicknames(nicknames: Record<string, string>) {
    this.nicknames = nicknames
  }

  setEditing(editing: string | null) {
    this.editing = editing
    if (editing === null) {
      this.draft = ""
    }
  }

  setDraft(draft: string) {
    this.draft = draft
  }
}
