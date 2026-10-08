import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { Settings, type SettingsProps } from "@/features/settings/settings"

function ThemeSection() {
  return <p>Theme section</p>
}

function KeySection() {
  return <p>OpenRouter section</p>
}

function TitleSection() {
  return <p>Title section</p>
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

function AboutSection() {
  return <p>About section</p>
}

function ConnectSection() {
  return <p>Connect section</p>
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
      TitleModel={TitleSection}
      ProviderRouting={ProviderSection}
      PersonalisationSettings={PersonalisationSection}
      McpSettings={McpSection}
      CliSettings={CliSection}
      About={AboutSection}
      ConnectSettings={ConnectSection}
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

  it("can show only the about section when it is the active tab", () => {
    renderDialog({ tab: "about" })

    expect(screen.getByText("About section")).not.toBeNull()
    expect(screen.queryByText("CLI section")).toBeNull()
    expect(activeTab()).toBe("About")
  })

  it("can show only the Connect section when it is the active tab", () => {
    renderDialog({ tab: "connect" })

    expect(screen.getByText("Connect section")).not.toBeNull()
    expect(screen.queryByText("CLI section")).toBeNull()
    expect(activeTab()).toBe("Connect")
  })
})
