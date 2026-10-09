import type { ServerAddress } from "@/lib/server-address"
import { addressLabel } from "@/lib/server-address"
import type { Log } from "@/log/log"
import type { ConnectionStore } from "@/state/connection/connection-store/connection-store"
import type { MacPickerStore } from "@/features/mobile/mac-picker/mac-picker-store/mac-picker-store"

// What the picker needs from the phone's device: the saved Macs, and the
// switch, which boots the whole app against the picked Mac.
type PickerDevice = {
  loadServers: () => Promise<ServerAddress[]>
  saveAddress: (address: ServerAddress) => Promise<void>
  reload: () => void
}

export class MacPickerPresenter {
  constructor(
    private readonly store: MacPickerStore,
    private readonly device: PickerDevice,
    private readonly connection: ConnectionStore,
    private readonly log: Log,
  ) {}

  start = () => {
    void this.reload()
  }

  // Whether this Mac is the one the phone is connected to right now.
  isActive = (address: ServerAddress): boolean => {
    return address.host === this.connection.address.host && address.port === this.connection.address.port
  }

  handleOpenChange = (open: boolean) => {
    this.store.setOpen(open)
    // The roster changes rarely, so it is re-read when the dropdown opens.
    if (open) {
      void this.reload()
    }
  }

  // Switching Macs boots the whole app against the picked one, the same path a
  // fresh QR code takes.
  handlePick = (address: ServerAddress): void => {
    if (this.isActive(address)) {
      this.store.setOpen(false)
      return
    }
    this.log.action("switch-server", { label: addressLabel(address) })
    this.store.setOpen(false)
    void this.device.saveAddress(address).then(() => this.device.reload())
  }

  private reload = async () => {
    try {
      this.store.setServers(await this.device.loadServers())
    } catch (error) {
      this.log.warn("load-servers-failed", { error })
    }
  }
}

