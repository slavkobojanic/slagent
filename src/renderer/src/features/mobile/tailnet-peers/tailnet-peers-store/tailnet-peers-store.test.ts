import { describe, expect, it } from "vitest"
import { TailnetPeersStore } from "./tailnet-peers-store"

describe("TailnetPeersStore", () => {
  it("starts empty and not loading", () => {
    const store = new TailnetPeersStore()

    expect(store.peers).toEqual([])
    expect(store.loading).toBe(false)
  })

  it("can hold the discovered peers", () => {
    const store = new TailnetPeersStore()
    store.setPeers([{ name: "personal.tail-scale.ts.net", host: "100.64.0.5", port: 8747, online: true }])

    expect(store.peers).toHaveLength(1)
  })
})
