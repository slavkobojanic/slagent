import type { Device } from "@/ipc/device"
import { addressLabel, parseServerAddress } from "@/lib/server-address"
import type { Log } from "@/log/log"
import type { ConnectStore } from "@/features/mobile/connect/connect-store/connect-store"

export class ConnectPresenter {
  private stopLinks: (() => void) | null = null

  constructor(
    private readonly store: ConnectStore,
    private readonly device: Device,
    private readonly log: Log,
  ) {}

  // A slagent://connect link from the desktop's QR code can arrive at any time, and at launch.
  start = () => {
    if (this.stopLinks !== null) {
      return
    }
    this.stopLinks = this.device.onUrlOpen(this.handleLink)
  }

  stop = () => {
    this.stopLinks?.()
    this.stopLinks = null
  }

  handleTextChange = (value: string) => {
    this.store.setText(value)
  }

  handleLink = (url: string) => {
    if (parseServerAddress(url) === null) {
      return
    }
    this.log.action("open-connect-link")
    this.store.setText(url)
    void this.connect()
  }

  handleSubmit = () => {
    if (!this.store.canConnect) {
      return
    }
    this.log.action("connect")
    void this.connect()
  }

  private connect = async () => {
    const address = this.store.address
    if (address === null) {
      this.store.setError("Paste the address from Settings → Connect on your Mac. It starts with ws:// and has a token.")
      return
    }
    this.store.setBusy(true)
    try {
      const reachable = await this.device.probe(address)
      if (!reachable) {
        this.store.setError(`Couldn't reach slagent at ${addressLabel(address)}. Check that it is open on your Mac and that both devices are on Tailscale.`)
        return
      }
      await this.device.saveAddress(address)
      this.device.reload()
    } catch (error) {
      this.log.warn("connect-failed", { error })
      this.store.setError("Couldn't save the address.")
    } finally {
      this.store.setBusy(false)
    }
  }
}
