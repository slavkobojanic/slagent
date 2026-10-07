import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import type { McpServerStatus } from "@shared/types"
import { TooltipProvider } from "@/components/ui/tooltip"
import { McpServerList, type McpServerListProps } from "@/features/settings/mcp-settings/mcp-server-list/mcp-server-list"

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

function props(overrides: Partial<McpServerListProps> = {}): McpServerListProps {
  return {
    servers: [],
    busyName: null,
    onSignIn: () => undefined,
    onSignOut: () => undefined,
    onSetEnabled: () => undefined,
    ...overrides,
  }
}

// The row actions sit in tooltips, which need a provider the app mounts at the root.
function renderList(overrides: Partial<McpServerListProps>) {
  return render(
    <TooltipProvider>
      <McpServerList {...props(overrides)} />
    </TooltipProvider>,
  )
}

function button(name: string): HTMLButtonElement | null {
  return screen.queryByRole("button", { name }) as HTMLButtonElement | null
}

describe("McpServerList", () => {
  it("can show the empty note when no servers are configured", () => {
    renderList({})

    expect(screen.getByText("No MCP servers are configured yet.")).not.toBeNull()
    expect(screen.queryByRole("table")).toBeNull()
  })

  it("can list each server with its status and the sign-in and sign-out actions", () => {
    renderList({ servers: [docs, wiki] })

    expect(screen.getByText("Reauthenticate")).not.toBeNull()
    expect(screen.getByText("Connected")).not.toBeNull()
    expect(button("Sign in")).not.toBeNull()
    expect(button("Sign out")).not.toBeNull()
    expect(screen.getByText("Team wiki")).not.toBeNull()
  })

  it("can disable the actions of the one server that is busy", () => {
    renderList({ servers: [docs, wiki], busyName: "docs" })

    // docs is the first row, so its Disable button comes first; wiki's row stays live.
    const disableButtons = screen.getAllByRole("button", { name: "Disable" }) as HTMLButtonElement[]
    expect(button("Sign in")?.disabled).toBe(true)
    expect(disableButtons[0]?.disabled).toBe(true)
    expect(disableButtons[1]?.disabled).toBe(false)
  })
})
