import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { viewMarkup } from "@/test/view-markup"
import { TailnetPeers, type TailnetPeersProps } from "./tailnet-peers"

const PEERS = [
  { name: "personal.tail-scale.ts.net", host: "100.64.0.5", port: 8747, online: true },
  { name: "work.tail-scale.ts.net", host: "100.64.0.9", port: 8747, online: false },
  { name: "studio.tail-scale.ts.net", host: "100.64.0.7", port: 8747, online: true },
]
const CURRENT = { host: "100.64.0.9", port: 8747, token: "t" }
const SAVED = { host: "100.64.0.7", port: 8747, token: "t2" }

function props(overrides: Partial<TailnetPeersProps> = {}): TailnetPeersProps {
  return {
    peers: PEERS,
    loading: false,
    current: CURRENT,
    saved: [SAVED],
    onPick: vi.fn(),
    onRefresh: vi.fn(),
    ...overrides,
  }
}

describe("TailnetPeers", () => {
  it("can list the machines not connected before with a connect button", () => {
    render(<TailnetPeers {...props()} />)

    expect(screen.getByText("On your Tailscale network")).not.toBeNull()
    expect(screen.getByText("personal.tail-scale.ts.net")).not.toBeNull()
    expect(screen.getAllByRole("button", { name: "Connect" })).toHaveLength(1)
  })

  it("can leave out the connected Mac", () => {
    render(<TailnetPeers {...props()} />)

    expect(screen.queryByText("work.tail-scale.ts.net")).toBeNull()
    expect(screen.queryByText("Active")).toBeNull()
  })

  it("can leave out Macs already saved, which have their own row", () => {
    render(<TailnetPeers {...props()} />)

    expect(screen.queryByText("studio.tail-scale.ts.net")).toBeNull()
  })

  it("can refresh the list from its heading", () => {
    render(<TailnetPeers {...props()} />)

    expect(screen.getByRole("button", { name: "Refresh" })).not.toBeNull()
  })

  it("can spin the refresh while the list loads", () => {
    const markup = viewMarkup(<TailnetPeers {...props({ loading: true })} />)

    expect(markup).toContain("animate-spin")
  })

  it("can hide the heading when every machine is already connected", () => {
    render(<TailnetPeers {...props({ saved: [SAVED, { host: "100.64.0.5", port: 8747, token: "t3" }] })} />)

    expect(screen.queryByText("On your Tailscale network")).toBeNull()
  })

  it("can hide the heading when nothing is found", () => {
    render(<TailnetPeers {...props({ peers: [] })} />)

    expect(screen.queryByText("On your Tailscale network")).toBeNull()
  })
})
