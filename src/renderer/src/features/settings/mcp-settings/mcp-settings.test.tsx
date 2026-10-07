import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import type { McpServerStatus } from "@shared/types"
import { TooltipProvider } from "@/components/ui/tooltip"
import { McpSettings, type McpSettingsProps } from "@/features/settings/mcp-settings/mcp-settings"

const docs: McpServerStatus = {
  name: "docs",
  state: "needs-auth",
  enabled: true,
  oauth: true,
  tools: 0,
  description: null,
  detail: null,
}

const wiki: McpServerStatus = { ...docs, name: "wiki", state: "connected", description: "Team wiki" }

function props(overrides: Partial<McpSettingsProps> = {}): McpSettingsProps {
  return {
    servers: [],
    refreshing: false,
    busyName: null,
    error: null,
    onRefresh: () => undefined,
    onSignIn: () => undefined,
    onSignOut: () => undefined,
    onSetEnabled: () => undefined,
    ...overrides,
  }
}

// The row actions sit in tooltips, which need a provider the app mounts at the root.
function renderSection(overrides: Partial<McpSettingsProps>) {
  return render(
    <TooltipProvider>
      <McpSettings {...props(overrides)} />
    </TooltipProvider>,
  )
}

function button(name: string): HTMLButtonElement | null {
  return screen.queryByRole("button", { name }) as HTMLButtonElement | null
}

describe("McpSettings", () => {
  it("can show the empty note when no servers are configured", () => {
    renderSection({})

    expect(screen.getByText("No MCP servers are configured yet.")).not.toBeNull()
    expect(screen.queryByRole("table")).toBeNull()
  })

  it("can list each server with its status and the sign-in and sign-out actions", () => {
    renderSection({ servers: [docs, wiki] })

    expect(screen.getByText("Reauthenticate")).not.toBeNull()
    expect(screen.getByText("Connected")).not.toBeNull()
    expect(button("Sign in")).not.toBeNull()
    expect(button("Sign out")).not.toBeNull()
    expect(screen.getByText("Team wiki")).not.toBeNull()
  })

  it("can disable refresh while a refresh runs", () => {
    renderSection({ refreshing: true })

    expect(screen.getByRole("button", { name: "Refresh" }).hasAttribute("disabled")).toBe(true)
  })

  it("can disable the actions of the one server that is busy", () => {
    renderSection({ servers: [docs, wiki], busyName: "docs" })

    // docs is the first row, so its Disable button comes first; wiki's row stays live.
    const disableButtons = screen.getAllByRole("button", { name: "Disable" }) as HTMLButtonElement[]
    expect(button("Sign in")?.disabled).toBe(true)
    expect(disableButtons[0]?.disabled).toBe(true)
    expect(disableButtons[1]?.disabled).toBe(false)
  })

  it("can show the error from a failed action as an alert", () => {
    renderSection({ servers: [docs], error: "Browser closed" })

    expect(screen.getByRole("alert").textContent).toBe("Browser closed")
  })
})
