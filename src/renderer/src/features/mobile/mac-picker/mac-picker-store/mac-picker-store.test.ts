import { describe, expect, it } from "vitest"
import { MacPickerStore } from "./mac-picker-store"

describe("MacPickerStore", () => {
  it("starts closed with no saved Macs", () => {
    const store = new MacPickerStore()

    expect(store.open).toBe(false)
    expect(store.servers).toEqual([])
  })

  it("can open and hold the roster", () => {
    const store = new MacPickerStore()
    store.setOpen(true)
    store.setServers([{ host: "100.64.0.1", port: 8747, token: "t1" }])

    expect(store.open).toBe(true)
    expect(store.servers).toHaveLength(1)
  })
})
