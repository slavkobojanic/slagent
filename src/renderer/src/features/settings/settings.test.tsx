import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { Settings, type SettingsProps } from "@/features/settings/settings"

// The genie warp checks prefers-reduced-motion. With reduced motion it skips building the
// warp strips, which need real layout that jsdom does not have.
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  })
})

afterEach(() => {
  Reflect.deleteProperty(window, "matchMedia")
})

function ThemeSection() {
  return <p>Theme section</p>
}

function KeySection() {
  return <p>OpenRouter section</p>
}

function ProviderSection() {
  return <p>Provider section</p>
}

function PersonalisationSection() {
  return <p>Personalisation section</p>
}

function McpSection() {
  return <p>MCP section</p>
}

function CliSection() {
  return <p>CLI section</p>
}

function renderDialog(overrides: Partial<SettingsProps> = {}) {
  return render(
    <Settings
      open
      tab="general"
      onTabChange={() => undefined}
      onOpenChange={() => undefined}
      ThemePicker={ThemeSection}
      OpenRouterKey={KeySection}
      ProviderRouting={ProviderSection}
      PersonalisationSettings={PersonalisationSection}
      McpSettings={McpSection}
      CliSettings={CliSection}
      {...overrides}
    />,
  )
}

function activeTab(): string | null {
  const active = screen.getAllByRole("button").find((button) => button.getAttribute("aria-current") === "page")
  return active?.textContent ?? null
}

describe("Settings", () => {
  it("can render nothing while the dialog is closed", () => {
    renderDialog({ open: false })

    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("can show the general section with the theme and the OpenRouter key", () => {
    renderDialog()

    expect(screen.getByText("Theme section")).not.toBeNull()
    expect(screen.getByText("OpenRouter section")).not.toBeNull()
    expect(screen.getByText("Provider section")).not.toBeNull()
    expect(screen.queryByText("MCP section")).toBeNull()
    expect(activeTab()).toBe("General")
  })

  it("can show only the personalisation section when it is the active tab", () => {
    renderDialog({ tab: "personalisation" })

    expect(screen.getByText("Personalisation section")).not.toBeNull()
    expect(screen.queryByText("Theme section")).toBeNull()
    expect(activeTab()).toBe("Personalisation")
  })

  it("can show only the MCP section when it is the active tab", () => {
    renderDialog({ tab: "mcp" })

    expect(screen.getByText("MCP section")).not.toBeNull()
    expect(screen.queryByText("CLI section")).toBeNull()
    expect(activeTab()).toBe("MCP")
  })

  it("can show only the CLI section when it is the active tab", () => {
    renderDialog({ tab: "cli" })

    expect(screen.getByText("CLI section")).not.toBeNull()
    expect(screen.queryByText("MCP section")).toBeNull()
    expect(activeTab()).toBe("CLI")
  })
})
