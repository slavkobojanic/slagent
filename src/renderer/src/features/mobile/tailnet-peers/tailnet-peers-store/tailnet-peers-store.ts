import { makeAutoObservable } from "mobx"
import type { TailscalePeer } from "@shared/types"

// The machines on the tailnet that run slagent, as the connected Mac reports
// them, for the connection sheet's quick-connect list.
export class TailnetPeersStore {
  peers: TailscalePeer[] = []
  loading = false

  constructor() {
    makeAutoObservable(this)
  }

  setPeers(peers: TailscalePeer[]) {
    this.peers = peers
  }

  setLoading(loading: boolean) {
    this.loading = loading
  }
}
