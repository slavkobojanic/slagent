import type { ServerAddress } from "@/lib/server-address"
import { addressLabel } from "@/lib/server-address"
import type { Log } from "@/log/log"
import type { Device } from "@/ipc/device"
import type { SavedServersStore } from "@/features/mobile/saved-servers/saved-servers-store/saved-servers-store"

export class SavedServersPresenter {
  constructor(
    private readonly store: SavedServersStore,
    private readonly device: Device,
    // Kept current with nicknames, so the connected Mac's label follows a rename.
    // Null on the connect page, where no connection exists yet.
    private readonly connection: { setNicknames: (nicknames: Record<string, string>) => void } | null,
    private readonly log: Log,
  ) {}

  start = () => {
    void this.reload()
  }

  // Switches to another Mac: save it as the active one and boot the whole app
  // against it, the same path a fresh QR code takes.
  handlePick = (address: ServerAddress): void => {
    this.log.action("switch-server", { label: addressLabel(address) })
    void this.device.saveAddress(address).then(() => this.device.reload())
  }

  handleRemove = (address: ServerAddress): void => {
    this.log.action("forget-server", { label: addressLabel(address) })
    void this.device.forgetServer(address).then(() => this.reload())
  }

  handleRenameStart = (address: ServerAddress): void => {
    this.log.action("rename-start", { label: addressLabel(address) })
    this.store.setEditing(`${address.host}:${address.port}`)
    this.store.setDraft(this.store.nicknames[`${address.host}:${address.port}`] ?? "")
  }

  handleRenameChange = (value: string): void => {
    this.store.setDraft(value)
  }

  handleRenameSave = async (): Promise<void> => {
    const key = this.store.editing
    if (key === null) {
      return
    }
    const address = this.store.servers.find((saved) => `${saved.host}:${saved.port}` === key)
    if (address === undefined) {
      this.store.setEditing(null)
      return
    }
    this.log.action("rename-save", { label: addressLabel(address), nickname: this.store.draft })
    this.store.setEditing(null)
    await this.device.saveNickname(address, this.store.draft)
    await this.reload()
    this.connection?.setNicknames(this.store.nicknames)
  }

  handleRenameCancel = (): void => {
    this.store.setEditing(null)
  }

  private reload = async () => {
    const [servers, nicknames] = await Promise.all([this.device.loadServers(), this.device.loadNicknames()])
    this.store.setServers(servers)
    this.store.setNicknames(nicknames)
  }
}
