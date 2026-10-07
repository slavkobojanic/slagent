import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import type { CliStatus } from "@shared/types"
import { CliSettings, type CliSettingsProps } from "@/features/settings/cli-settings/cli-settings"

const path = "/usr/local/bin/slagent"

function InstallSlot() {
  return <p>Install slot</p>
}

function UninstallSlot() {
  return <p>Uninstall slot</p>
}

function props(overrides: Partial<CliSettingsProps> = {}): CliSettingsProps {
  return {
    status: null,
    error: null,
    InstallCommand: InstallSlot,
    UninstallCommand: UninstallSlot,
    ...overrides,
  }
}

describe("CliSettings", () => {
  it("can show the actions without the install path before the status loads", () => {
    render(<CliSettings {...props()} />)

    expect(screen.getByText("Install slot")).not.toBeNull()
    expect(screen.queryByText(/Installs to/)).toBeNull()
  })

  it("can show a missing command with the install path", () => {
    const status: CliStatus = { path, state: "missing" }

    render(<CliSettings {...props({ status })} />)

    expect(screen.getByText("Not installed")).not.toBeNull()
    expect(screen.getByText(path)).not.toBeNull()
  })

  it("can show the command as installed", () => {
    const status: CliStatus = { path, state: "installed" }

    render(<CliSettings {...props({ status })} />)

    expect(screen.getByText("Installed")).not.toBeNull()
    expect(screen.getByText("Uninstall slot")).not.toBeNull()
  })

  it("can show that an update is available for an outdated command", () => {
    const status: CliStatus = { path, state: "outdated" }

    render(<CliSettings {...props({ status })} />)

    expect(screen.getByText("Update available")).not.toBeNull()
  })

  it("can explain the path in use when another program owns it", () => {
    const status: CliStatus = { path, state: "conflict" }

    render(<CliSettings {...props({ status })} />)

    expect(screen.getByText("Path in use")).not.toBeNull()
    expect(screen.getByText(/Another program already has a file at/)).not.toBeNull()
  })

  it("can show macOS only and no actions on an unsupported platform", () => {
    const status: CliStatus = { path: "", state: "unsupported" }

    render(<CliSettings {...props({ status })} />)

    expect(screen.getByText("macOS only")).not.toBeNull()
    expect(screen.queryByText("Install slot")).toBeNull()
    expect(screen.queryByText("Uninstall slot")).toBeNull()
  })

  it("can show the error from a failed action as an alert", () => {
    const status: CliStatus = { path, state: "missing" }

    render(<CliSettings {...props({ status, error: "Password required" })} />)

    expect(screen.getByRole("alert").textContent).toBe("Password required")
  })
})
