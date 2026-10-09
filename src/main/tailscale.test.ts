import { describe, expect, it } from "vitest"
import { parsePeers } from "./tailscale"

function status(peers: Record<string, object>): string {
  return JSON.stringify({ Peer: peers })
}

describe("parsePeers", () => {
  it("can turn the status peer map into slagent candidates with their first tailnet IP", () => {
    const peers = parsePeers(
      status({
        k1: { DNSName: "personal.tail-scale.ts.net.", TailscaleIPs: ["100.64.0.5", "fd7a:115c:a1e0::5"], Online: true },
        k2: { DNSName: "work.tail-scale.ts.net.", TailscaleIPs: ["100.64.0.9"], Online: false },
      }),
    )

    expect(peers).toEqual([
      { name: "personal.tail-scale.ts.net", host: "100.64.0.5", port: 8747, online: true },
      { name: "work.tail-scale.ts.net", host: "100.64.0.9", port: 8747, online: false },
    ])
  })

  it("can include the reporting Mac itself, which arrives as Self, so the list holds the whole fleet", () => {
    const peers = parsePeers(
      JSON.stringify({
        Self: { DNSName: "personal.tail-scale.ts.net.", TailscaleIPs: ["100.64.0.5"], Online: true },
        Peer: { k1: { DNSName: "work.tail-scale.ts.net.", TailscaleIPs: ["100.64.0.9"], Online: true } },
      }),
    )

    expect(peers).toEqual([
      { name: "work.tail-scale.ts.net", host: "100.64.0.9", port: 8747, online: true },
      { name: "personal.tail-scale.ts.net", host: "100.64.0.5", port: 8747, online: true },
    ])
  })

  it("can fall back to the hostname when the DNS name is missing", () => {
    const peers = parsePeers(status({ k1: { HostName: "studio", TailscaleIPs: ["100.64.0.7"] } }))

    expect(peers).toEqual([{ name: "studio", host: "100.64.0.7", port: 8747, online: true }])
  })

  it("can leave out peers without an address or a name", () => {
    const peers = parsePeers(
      status({
        k1: { DNSName: "personal.tail-scale.ts.net." },
        k2: { HostName: "", TailscaleIPs: ["100.64.0.7"] },
        k3: { HostName: "studio", TailscaleIPs: ["100.64.0.7"] },
      }),
    )

    expect(peers).toEqual([{ name: "studio", host: "100.64.0.7", port: 8747, online: true }])
  })

  it("can survive output that is not the status JSON", () => {
    expect(parsePeers("not json")).toEqual([])
  })
})
