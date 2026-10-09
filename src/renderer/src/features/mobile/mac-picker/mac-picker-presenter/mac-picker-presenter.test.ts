import { describe, expect, it } from "vitest"
import type { ServerAddress } from "@/lib/server-address"
import { ConnectionStore } from "@/state/connection/connection-store/connection-store"
import type { Device } from "@/ipc/device"
import { nullLog } from "@/log/log"
import { createMockInstance } from "@/test/create-mock-instance"
import { MacPickerPresenter } from "./mac-picker-presenter"
import { MacPickerStore } from "@/features/mobile/mac-picker/mac-picker-store/mac-picker-store"

const MAC = { host: "100.64.0.1", port: 8747, token: "t1", name: "Slavkos-MacBook-Pro" }
const STUDIO = { host: "100.64.0.9", port: 8747, token: "t2", name: "Studio-Mac" }

function connection(address: ServerAddress, online: boolean): ConnectionStore {
  const store = new ConnectionStore(address)
  store.setStatus(online ? "open" : "connecting")
  return store
}

function setup(address: ServerAddress = MAC, servers: ServerAddress[] = [MAC, STUDIO]) {
  const store = new MacPickerStore()
  const device = createMockInstance<Device>(["loadServers", "saveAddress", "reload"])
  device.loadServers.mockResolvedValue(servers)
  device.saveAddress.mockResolvedValue(undefined)
  const presenter = new MacPickerPresenter(store, device, connection(address, true), nullLog())
  return { store, device, presenter }
}

describe("MacPickerPresenter", () => {
  it("can load the roster of every Mac the phone has connected to", async () => {
    const { store, presenter } = setup()
    await presenter.start()

    expect(store.servers).toEqual([MAC, STUDIO])
  })

  it("can mark the connected Mac as the active one", () => {
    const { presenter } = setup()

    expect(presenter.isActive(MAC)).toBe(true)
    expect(presenter.isActive(STUDIO)).toBe(false)
  })

  it("can open the dropdown and read the roster again when it does", async () => {
    const { store, presenter } = setup()
    await presenter.start()

    presenter.handleOpenChange(true)

    expect(store.open).toBe(true)
  })

  it("can switch Macs by saving the pick and booting the app against it", async () => {
    const { device, presenter } = setup()

    presenter.handlePick(STUDIO)
    await Promise.resolve()

    expect(device.saveAddress).toHaveBeenCalledWith(STUDIO)
    expect(device.reload).toHaveBeenCalled()
  })

  it("can close the dropdown without switching when the active Mac is picked", async () => {
    const { store, device, presenter } = setup()

    presenter.handlePick(MAC)
    await Promise.resolve()

    expect(store.open).toBe(false)
    expect(device.saveAddress).not.toHaveBeenCalled()
  })

  it("can close the dropdown", () => {
    const { store, presenter } = setup()
    presenter.handleOpenChange(true)

    presenter.handleOpenChange(false)

    expect(store.open).toBe(false)
  })
})
