import { describe, expect, it } from "vitest"
import { ShellHeader, type ShellHeaderProps } from "@/features/shell/shell-header"
import { viewMarkup } from "@/test/view-markup"

const noop = () => undefined

const base: ShellHeaderProps = {
  macos: true,
  sidebarOpen: true,
  sidebarTitle: "Hide sidebar (⌘B)",
  onToggleSidebar: noop,
  projectLabel: "slagent",
  projectPath: "/work/slagent",
  projects: [],
  chatTitle: null,
  onOpenProject: noop,
  onChooseFolder: noop,
  updateVersion: null,
  installingUpdate: false,
  onInstallUpdate: noop,
  modelName: "Claude Sonnet",
  modelProvider: "openrouter",
  configured: true,
  modelDisabled: false,
  onOpenModel: noop,
  panelOpen: false,
  panelTitle: "Show panel (⌘⇧D)",
  panelDisabled: false,
  onTogglePanel: noop,
  mcpNeedsAuth: false,
  onOpenSettings: noop,
}

describe("ShellHeader", () => {
  it("can leave room for the traffic lights on macOS", () => {
    const markup = viewMarkup(<ShellHeader {...base} />)

    expect(markup).toContain("pl-20")
  })

  it("can use the regular left padding off macOS", () => {
    const markup = viewMarkup(<ShellHeader {...base} macos={false} />)

    expect(markup).toContain("pl-4")
    expect(markup).not.toContain("pl-20")
  })

  it("can show the open chat title after the project name", () => {
    const markup = viewMarkup(<ShellHeader {...base} chatTitle="Fix the build" />)

    expect(markup).toContain(">Fix the build</span>")
  })

  it("can offer the waiting update with its version", () => {
    const markup = viewMarkup(<ShellHeader {...base} updateVersion="1.2.0" />)

    expect(markup).toContain("Update available (v1.2.0)")
  })

  it("can disable the update button while the update installs", () => {
    const markup = viewMarkup(<ShellHeader {...base} updateVersion="1.2.0" installingUpdate />)

    expect(markup).toContain('disabled=""')
  })

  it("can mark the model button when no provider is connected", () => {
    const markup = viewMarkup(<ShellHeader {...base} configured={false} />)

    expect(markup).toContain("bg-warning")
  })

  it("can mark the settings button when an MCP server needs sign-in", () => {
    const markup = viewMarkup(<ShellHeader {...base} mcpNeedsAuth />)

    expect(markup).toContain("bg-warning")
  })

  it("can mark the settings button as the origin of the settings dialog's genie animation", () => {
    const markup = viewMarkup(<ShellHeader {...base} />)

    expect(markup).toContain('data-genie-target="settings"')
  })

  it("can show no badge when a provider is connected and no MCP server needs sign-in", () => {
    const markup = viewMarkup(<ShellHeader {...base} />)

    expect(markup).not.toContain("bg-warning")
  })

  it("can mark the panel button as pressed while the panel is open", () => {
    const markup = viewMarkup(<ShellHeader {...base} panelOpen />)

    expect(markup).toContain('aria-pressed="true"')
  })
})
