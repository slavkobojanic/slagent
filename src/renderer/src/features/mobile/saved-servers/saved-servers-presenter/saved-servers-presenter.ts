import type { ServerAddress } from "@/lib/server-address"
import type { Log } from "@/log/log"
import type { Device } from "@/ipc/device"
import type { SavedServersStore } from "@/features/mobile/saved-servers/saved-servers-store/saved-servers-store"

export class SavedServersPresenter {
  constructor(
    private readonly store: SavedServersStore,
    private readonly device: Device,
    private readonly log: Log,
  ) {}

  start = () => {
    void this.reload()
  }

  // Switches to another Mac: save it as the active one and boot the whole app
  // against it, the same path a fresh QR code takes.
  handlePick = (address: ServerAddress): void => {
    this.log.action("switch-server", { label: address.name ?? address.host })
    void this.device.saveAddress(address).then(() => this.device.reload())
  }

  handleRemove = (address: ServerAddress): void => {
    this.log.action("forget-server", { label: address.name ?? address.host })
    void this.device.forgetServer(address).then(() => this.reload())
  }

  private reload = async () => {
    this.store.setServers(await this.device.loadServers())
  }
}
