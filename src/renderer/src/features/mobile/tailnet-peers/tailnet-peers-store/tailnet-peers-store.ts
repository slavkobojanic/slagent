import { makeAutoObservable } from "mobx"
import type { TailscalePeer } from "@shared/types"
import type { ServerAddress } from "@/lib/server-address"

// The machines on the tailnet that run slagent, as the connected Mac reports
// them, for the connection sheet's quick-connect list.
export class TailnetPeersStore {
  peers: TailscalePeer[] = []
  saved: ServerAddress[] = []
  loading = false

  constructor() {
    makeAutoObservable(this)
  }

  setPeers(peers: TailscalePeer[]) {
    this.peers = peers
  }

  setSaved(saved: ServerAddress[]) {
    this.saved = saved
  }

  setLoading(loading: boolean) {
    this.loading = loading
  }
}
