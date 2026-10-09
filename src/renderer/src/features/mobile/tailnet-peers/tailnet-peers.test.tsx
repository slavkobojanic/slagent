import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { TailnetPeers, type TailnetPeersProps } from "./tailnet-peers"

const PEERS = [
  { name: "personal.tail-scale.ts.net", host: "100.64.0.5", port: 8747, online: true },
  { name: "work.tail-scale.ts.net", host: "100.64.0.9", port: 8747, online: false },
]

function props(overrides: Partial<TailnetPeersProps> = {}): TailnetPeersProps {
  return {
    peers: PEERS,
    loading: false,
    saved: [],
    onPick: vi.fn(),
    ...overrides,
  }
}

describe("TailnetPeers", () => {
  it("can list the tailnet's slagent machines with their online status and a connect button", () => {
    render(<TailnetPeers {...props()} />)

    expect(screen.getByText("On your Tailscale network")).not.toBeNull()
    expect(screen.getByText("personal.tail-scale.ts.net")).not.toBeNull()
    expect(screen.getByText("work.tail-scale.ts.net")).not.toBeNull()
    expect(screen.getAllByRole("button", { name: "Connect" })).toHaveLength(2)
  })

  it("can hold the list back when there are no candidates", () => {
    const { container } = render(<TailnetPeers {...props({ peers: [] })} />)

    expect(container.textContent).toBe("")
  })

  it("can explain the search while it runs with no results yet", () => {
    render(<TailnetPeers {...props({ peers: [], loading: true })} />)

    expect(screen.getByText("Looking for Macs…")).not.toBeNull()
  })

  it("can leave out Macs that are already in the saved roster", () => {
    render(<TailnetPeers {...props({ saved: [{ host: "100.64.0.5", port: 8747, token: "t" }] })} />)

    expect(screen.queryByText("personal.tail-scale.ts.net")).toBeNull()
    expect(screen.getByText("work.tail-scale.ts.net")).not.toBeNull()
  })
})
