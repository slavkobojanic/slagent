import type { WsClient, WsStatus } from "@shared/ws-client"
import type { Device } from "@/ipc/device"
import type { Log } from "@/log/log"
import type { ConnectionStore } from "@/state/connection/connection-store/connection-store"

export class ConnectionPresenter {
  private disposers: Array<() => void> = []

  constructor(
    private readonly store: ConnectionStore,
    private readonly client: WsClient,
    private readonly device: Device,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.disposers.length > 0) {
      return
    }
    this.store.setStatus(this.client.status)
    this.client.statusListeners.add(this.handleStatus)
    this.disposers.push(() => this.client.statusListeners.delete(this.handleStatus))
    // iOS drops the socket while the app sleeps; coming back should not wait out the retry timer.
    this.disposers.push(this.device.onResume(this.client.wake))
  }

  stop = () => {
    for (const dispose of this.disposers.splice(0)) dispose()
  }

  forget = async () => {
    this.log.action("forget-server", { label: this.store.label })
    this.client.close()
    await this.device.saveAddress(null)
    this.device.reload()
  }

  private handleStatus = (status: WsStatus) => {
    this.log.info("status", { status })
    this.store.setStatus(status)
  }
}
