import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { SavedServers, type SavedServersProps } from "./saved-servers"

const MAC = { host: "100.64.0.1", port: 8747, token: "t1", name: "Slavkos-MacBook-Pro" }
const STUDIO = { host: "100.64.0.9", port: 8747, token: "t2", name: "Studio-Mac" }

function props(overrides: Partial<SavedServersProps> = {}): SavedServersProps {
  return {
    servers: [MAC, STUDIO],
    nicknames: {},
    editing: null,
    draft: "",
    onRenameStart: vi.fn(),
    onRenameChange: vi.fn(),
    onRenameSave: vi.fn(),
    onRenameCancel: vi.fn(),
    heading: "Switch to another Mac",
    onPick: vi.fn(),
    onRemove: vi.fn(),
    ...overrides,
  }
}

describe("SavedServers", () => {
  it("can show each saved Mac with a connect and forget button", () => {
    render(<SavedServers {...props()} />)

    expect(screen.getByText("Slavkos-MacBook-Pro")).not.toBeNull()
    expect(screen.getAllByRole("button", { name: "Connect" })).toHaveLength(2)
    expect(screen.getByRole("button", { name: "Forget Slavkos-MacBook-Pro" })).not.toBeNull()
  })

  it("can show a Mac's nickname instead of its hostname", () => {
    render(<SavedServers {...props({ nicknames: { "100.64.0.1:8747": "Work Mac" } })} />)

    expect(screen.getByText("Work Mac")).not.toBeNull()
    expect(screen.queryByText("Slavkos-MacBook-Pro")).toBeNull()
    expect(screen.getByText("100.64.0.1:8747")).not.toBeNull()
  })

  it("can offer a rename on every row", () => {
    render(<SavedServers {...props()} />)

    expect(screen.getByRole("button", { name: "Rename Slavkos-MacBook-Pro" })).not.toBeNull()
    expect(screen.getByRole("button", { name: "Rename Studio-Mac" })).not.toBeNull()
  })

  it("can open a rename box on one row with the current nickname as the draft", () => {
    render(<SavedServers {...props({ editing: "100.64.0.1:8747", draft: "Work" })} />)

    expect(screen.getByLabelText("Nickname")).not.toBeNull()
    expect(screen.getByDisplayValue("Work")).not.toBeNull()
    expect(screen.getByRole("button", { name: "Save nickname" })).not.toBeNull()
    // Only the row being renamed hides its buttons; the other row stays normal.
    expect(screen.getAllByRole("button", { name: "Connect" })).toHaveLength(1)
  })
})
