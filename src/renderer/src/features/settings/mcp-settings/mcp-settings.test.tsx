import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { McpSettings, type McpSettingsProps } from "@/features/settings/mcp-settings/mcp-settings"

function ListSlot() {
  return <p>Server list</p>
}

function props(overrides: Partial<McpSettingsProps> = {}): McpSettingsProps {
  return {
    refreshing: false,
    error: null,
    onRefresh: () => undefined,
    McpServerList: ListSlot,
    ...overrides,
  }
}

describe("McpSettings", () => {
  it("can show the server list with refresh enabled", () => {
    render(<McpSettings {...props()} />)

    expect(screen.getByText("Server list")).not.toBeNull()
    expect(screen.getByRole("button", { name: "Refresh" }).hasAttribute("disabled")).toBe(false)
  })

  it("can disable refresh while a refresh runs", () => {
    render(<McpSettings {...props({ refreshing: true })} />)

    expect(screen.getByRole("button", { name: "Refresh" }).hasAttribute("disabled")).toBe(true)
  })

  it("can show the error from a failed action as an alert", () => {
    render(<McpSettings {...props({ error: "Browser closed" })} />)

    expect(screen.getByRole("alert").textContent).toBe("Browser closed")
  })
})
