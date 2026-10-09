import { describe, expect, it, vi } from "vitest"
import type { TailscalePeer } from "@shared/types"
import type { ServerAddress } from "@/lib/server-address"
import { ConnectionStore } from "@/state/connection/connection-store/connection-store"
import type { Device } from "@/ipc/device"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { createMockInstance } from "@/test/create-mock-instance"
import { TailnetPeersPresenter } from "./tailnet-peers-presenter"
import { TailnetPeersStore } from "@/features/mobile/tailnet-peers/tailnet-peers-store/tailnet-peers-store"
import { MobileStore } from "@/features/mobile/mobile-store/mobile-store"
import { LibraryStore } from "@/mirror/library-store/library-store"

const PERSONAL: TailscalePeer = { name: "personal.tail-scale.ts.net", host: "100.64.0.5", port: 8747, online: true }
const WORK: TailscalePeer = { name: "work.tail-scale.ts.net", host: "100.64.0.9", port: 8747, online: false }

function connection(online: boolean): ConnectionStore {
  const store = new ConnectionStore({ host: "100.64.0.9", port: 8747, token: "t" })
  store.setStatus(online ? "open" : "connecting")
  return store
}

function setup(online = true, peers: TailscalePeer[] = [PERSONAL, WORK], saved: ServerAddress[] = []) {
  const store = new TailnetPeersStore()
  const api = createMockInstance<API>(["tailscaleList", "onReconnect"])
  api.tailscaleList.mockResolvedValue(peers)
  api.onReconnect.mockReturnValue(() => undefined)
  const device = createMockInstance<Device>(["loadServers", "saveAddress", "reload"])
  device.loadServers.mockResolvedValue(saved)
  device.saveAddress.mockResolvedValue(undefined)
  const mobileStore = new MobileStore(new LibraryStore())
  mobileStore.connectionOpen = true
  const presenter = new TailnetPeersPresenter(store, api, device, connection(online), mobileStore, nullLog())
  return { store, api, device, mobileStore, presenter }
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

describe("TailnetPeersPresenter", () => {
  it("can fill the list from the connected Mac's tailnet and the saved roster", async () => {
    const { store, presenter } = setup()
    await presenter.start()
    await flush()

    expect(store.peers).toEqual([PERSONAL, WORK])
    expect(store.saved).toEqual([])
    expect(store.loading).toBe(false)
  })

  it("can leave the list empty while the phone is not connected", async () => {
    const { store, api, presenter } = setup(false)

    await presenter.start()

    expect(api.tailscaleList).not.toHaveBeenCalled()
    expect(store.peers).toEqual([])
  })

  it("can keep the list empty when the Mac has no Tailscale", async () => {
    const { store, presenter } = setup(true, [])
    vi.spyOn(console, "error").mockImplementation(() => undefined)

    await presenter.start()

    expect(store.peers).toEqual([])
  })

  it("can refresh when the connection sheet opens", async () => {
    const { store, api, mobileStore, presenter } = setup()
    mobileStore.connectionOpen = false
    await presenter.start()
    api.tailscaleList.mockClear()

    mobileStore.connectionOpen = true
    await Promise.resolve()
    await Promise.resolve()

    expect(api.tailscaleList).toHaveBeenCalled()
    expect(store.peers).toEqual([PERSONAL, WORK])
  })

  it("can switch to a peer by saving it without a token and booting the app against it", async () => {
    const { device, presenter } = setup()

    presenter.handlePick({ host: PERSONAL.host, port: PERSONAL.port, token: "", name: PERSONAL.name })
    await Promise.resolve()

    expect(device.saveAddress).toHaveBeenCalledWith({ host: "100.64.0.5", port: 8747, token: "", name: "personal.tail-scale.ts.net" })
    expect(device.reload).toHaveBeenCalled()
  })
})
