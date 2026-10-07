import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import type { McpServerStatus } from "@shared/types"
import { TooltipProvider } from "@/components/ui/tooltip"
import { McpServerRow, type McpServerRowProps } from "@/features/settings/mcp-settings/mcp-server-list/mcp-server-row/mcp-server-row"

const docs: McpServerStatus = {
  name: "docs",
  state: "connected",
  enabled: true,
  oauth: false,
  tools: 0,
  description: null,
  detail: null,
}

function renderRow(overrides: Partial<McpServerRowProps>) {
  return render(
    <TooltipProvider>
      <table>
        <tbody>
          <McpServerRow server={docs} busy={false} onSignIn={() => undefined} onSignOut={() => undefined} onToggle={() => undefined} {...overrides} />
        </tbody>
      </table>
    </TooltipProvider>,
  )
}

function button(name: string): HTMLButtonElement | null {
  return screen.queryByRole("button", { name }) as HTMLButtonElement | null
}

describe("McpServerRow", () => {
  it("can show only the toggle for a server without a sign-in", () => {
    renderRow({})

    expect(button("Disable")).not.toBeNull()
    expect(button("Sign in")).toBeNull()
    expect(button("Sign out")).toBeNull()
  })

  it("can offer to enable a disabled server", () => {
    renderRow({ server: { ...docs, enabled: false, state: "disabled" } })

    expect(screen.getByText("Disabled")).not.toBeNull()
    expect(button("Enable")).not.toBeNull()
  })

  it("can show the failure detail of a failing server", () => {
    renderRow({ server: { ...docs, state: "error", detail: "spawn ENOENT" } })

    expect(screen.getByText("Failing")).not.toBeNull()
    expect(screen.getByText("spawn ENOENT")).not.toBeNull()
  })
})
