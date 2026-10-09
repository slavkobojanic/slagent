import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { TailnetPeers, type TailnetPeersProps } from "./tailnet-peers"

const PEERS = [
  { name: "personal.tail-scale.ts.net", host: "100.64.0.5", port: 8747, online: true },
  { name: "work.tail-scale.ts.net", host: "100.64.0.9", port: 8747, online: false },
]
const CURRENT = { host: "100.64.0.9", port: 8747, token: "t" }

function props(overrides: Partial<TailnetPeersProps> = {}): TailnetPeersProps {
  return {
    peers: PEERS,
    loading: false,
    current: CURRENT,
    onPick: vi.fn(),
    ...overrides,
  }
}

describe("TailnetPeers", () => {
  it("can list every tailnet machine with its online status and a connect button", () => {
    render(<TailnetPeers {...props()} />)

    expect(screen.getByText("On your Tailscale network")).not.toBeNull()
    expect(screen.getByText("personal.tail-scale.ts.net")).not.toBeNull()
    expect(screen.getByText("work.tail-scale.ts.net")).not.toBeNull()
    expect(screen.getAllByRole("button", { name: "Connect" })).toHaveLength(1)
  })

  it("can mark the connected Mac as Active instead of offering a button", () => {
    render(<TailnetPeers {...props()} />)

    const row = screen.getByText("work.tail-scale.ts.net").closest(".flex.items-center")!
    expect(row.textContent).toContain("Active")
    expect(row.querySelector("button")).toBeNull()
  })

  it("can hold the list back when there are no candidates", () => {
    const { container } = render(<TailnetPeers {...props({ peers: [] })} />)

    expect(container.textContent).toBe("")
  })

  it("can explain the search while it runs with no results yet", () => {
    render(<TailnetPeers {...props({ peers: [], loading: true })} />)

    expect(screen.getByText("Looking for Macs…")).not.toBeNull()
  })
})
