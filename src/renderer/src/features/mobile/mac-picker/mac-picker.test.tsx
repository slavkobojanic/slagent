import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { MacPicker, type MacPickerProps } from "./mac-picker"

const MAC = { host: "100.64.0.1", port: 8747, token: "t1", name: "Slavkos-MacBook-Pro" }
const STUDIO = { host: "100.64.0.9", port: 8747, token: "t2", name: "Studio-Mac" }

function props(overrides: Partial<MacPickerProps> = {}): MacPickerProps {
  return {
    label: "Slavkos-MacBook-Pro",
    online: true,
    servers: [MAC, STUDIO],
    current: MAC,
    open: false,
    onOpenChange: vi.fn(),
    onPick: vi.fn(),
    ...overrides,
  }
}

describe("MacPicker", () => {
  it("can show the connected computer as a pill with a chevron", () => {
    const { container } = render(<MacPicker {...props()} />)

    expect(container.textContent).toContain("Slavkos-MacBook-Pro")
    expect(screen.getByRole("button", { name: "Connected to Slavkos-MacBook-Pro, switch computer" })).not.toBeNull()
  })

  it("can list each saved Mac in its dropdown with the active one marked", () => {
    render(<MacPicker {...props({ open: true })} />)

    const items = screen.getAllByRole("menuitem")
    expect(items).toHaveLength(2)
    expect(screen.getByText("Studio-Mac")).not.toBeNull()
    expect(screen.getByText("Active")).not.toBeNull()
  })

  it("can hold the Active mark back while the phone is offline", () => {
    render(<MacPicker {...props({ open: true, online: false })} />)

    expect(screen.getByText("Active")).not.toBeNull()
  })
})
