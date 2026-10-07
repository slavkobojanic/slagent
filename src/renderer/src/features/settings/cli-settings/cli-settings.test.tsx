import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import type { CliStatus } from "@shared/types"
import { CliSettings, type CliSettingsProps } from "@/features/settings/cli-settings/cli-settings"

const path = "/usr/local/bin/slagent"

function props(overrides: Partial<CliSettingsProps> = {}): CliSettingsProps {
  return {
    status: null,
    ownsCommand: false,
    canInstall: false,
    canUninstall: false,
    installing: false,
    uninstalling: false,
    error: null,
    onInstall: () => undefined,
    onUninstall: () => undefined,
    ...overrides,
  }
}

function button(name: string): HTMLButtonElement | null {
  return screen.queryByRole("button", { name }) as HTMLButtonElement | null
}

describe("CliSettings", () => {
  it("can show the install button disabled before the status loads", () => {
    render(<CliSettings {...props()} />)

    expect(button("Install command")?.disabled).toBe(true)
    expect(screen.queryByText(/Installs to/)).toBeNull()
  })

  it("can offer to install the command when it is missing", () => {
    const status: CliStatus = { path, state: "missing" }

    render(<CliSettings {...props({ status, canInstall: true })} />)

    expect(screen.getByText("Not installed")).not.toBeNull()
    expect(button("Install command")?.disabled).toBe(false)
    expect(button("Uninstall")).toBeNull()
  })

  it("can show the command as installed with only the uninstall action", () => {
    const status: CliStatus = { path, state: "installed" }

    render(<CliSettings {...props({ status, ownsCommand: true, canUninstall: true })} />)

    expect(screen.getByText("Installed")).not.toBeNull()
    expect(button("Install command")).toBeNull()
    expect(button("Uninstall")?.disabled).toBe(false)
  })

  it("can offer an update for an outdated command", () => {
    const status: CliStatus = { path, state: "outdated" }

    render(<CliSettings {...props({ status, ownsCommand: true, canInstall: true, canUninstall: true })} />)

    expect(screen.getByText("Update available")).not.toBeNull()
    expect(button("Update command")).not.toBeNull()
  })

  it("can explain the path in use and disable install when another program owns it", () => {
    const status: CliStatus = { path, state: "conflict" }

    render(<CliSettings {...props({ status, canInstall: false })} />)

    expect(screen.getByText("Path in use")).not.toBeNull()
    expect(screen.getByText(/Another program already has a file at/)).not.toBeNull()
    expect(button("Install command")?.disabled).toBe(true)
  })

  it("can show macOS only and no actions on an unsupported platform", () => {
    const status: CliStatus = { path: "", state: "unsupported" }

    render(<CliSettings {...props({ status })} />)

    expect(screen.getByText("macOS only")).not.toBeNull()
    expect(button("Install command")).toBeNull()
    expect(button("Uninstall")).toBeNull()
  })

  it("can show that the command is being installed with install disabled", () => {
    const status: CliStatus = { path, state: "missing" }

    render(<CliSettings {...props({ status, installing: true })} />)

    expect(button("Installing")?.disabled).toBe(true)
  })

  it("can show the error from a failed action as an alert", () => {
    const status: CliStatus = { path, state: "missing" }

    render(<CliSettings {...props({ status, canInstall: true, error: "Password required" })} />)

    expect(screen.getByRole("alert").textContent).toBe("Password required")
  })
})
