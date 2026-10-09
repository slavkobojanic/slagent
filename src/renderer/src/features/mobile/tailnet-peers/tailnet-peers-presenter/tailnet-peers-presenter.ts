import type { TailscalePeer } from "@shared/types"
import type { ServerAddress } from "@/lib/server-address"
import type { Log } from "@/log/log"
import type { ConnectionStore } from "@/state/connection/connection-store/connection-store"
import type { MobileStore } from "@/features/mobile/mobile-store/mobile-store"
import type { TailnetPeersStore } from "@/features/mobile/tailnet-peers/tailnet-peers-store/tailnet-peers-store"

// What the peers list needs from the phone's device: the switch, which boots
// the whole app against the picked Mac.
type PeersDevice = {
  saveAddress: (address: ServerAddress) => Promise<void>
  reload: () => void
}

type PeersApi = {
  tailscaleList: () => Promise<TailscalePeer[]>
  onReconnect: (listener: () => void) => () => void
}

// Asks the connected Mac for the tailnet's slagent machines — the whole fleet,
// the active Mac included — and switches the phone to one of them with a tap.
// The tailnet membership is the credential.
export class TailnetPeersPresenter {
  private disposers: Array<() => void> = []

  constructor(
    private readonly store: TailnetPeersStore,
    private readonly api: PeersApi,
    private readonly device: PeersDevice,
    private readonly connection: ConnectionStore,
    private readonly mobileStore: MobileStore,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.disposers.length > 0) {
      return
    }
    this.disposers = [
      // Opening the sheet fills the list; a reconnect may have missed events.
      this.log.reaction(
        "connection-open",
        () => this.mobileStore.connectionOpen,
        (open) => {
          if (open) void this.handleRefresh()
        },
      ),
      this.api.onReconnect(() => {
        if (this.mobileStore.connectionOpen) void this.handleRefresh()
      }),
    ]
    void this.handleRefresh()
  }

  handleRefresh = async () => {
    if (!this.connection.online) {
      return
    }
    this.store.setLoading(true)
    try {
      this.store.setPeers(await this.api.tailscaleList())
    } catch (error) {
      // No Tailscale, or an older Mac: the list just stays empty.
      this.log.debug("tailnet-list-failed", { error })
      this.store.setPeers([])
    } finally {
      this.store.setLoading(false)
    }
  }

  // Switching Macs boots the whole app against the picked one, the same path a
  // fresh QR code takes.
  handlePick = (address: ServerAddress): void => {
    this.log.action("switch-peer", { label: address.name ?? address.host })
    void this.device.saveAddress(address).then(() => this.device.reload())
  }
}
