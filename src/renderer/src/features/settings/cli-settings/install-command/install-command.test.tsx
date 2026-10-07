import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { InstallCommand, type InstallCommandProps } from "@/features/settings/cli-settings/install-command/install-command"

function props(overrides: Partial<InstallCommandProps> = {}): InstallCommandProps {
  return {
    visible: true,
    canInstall: true,
    installing: false,
    label: "Install command",
    onInstall: () => undefined,
    ...overrides,
  }
}

function button(name: string): HTMLButtonElement | null {
  return screen.queryByRole("button", { name }) as HTMLButtonElement | null
}

describe("InstallCommand", () => {
  it("can offer to install the command", () => {
    render(<InstallCommand {...props()} />)

    expect(button("Install command")?.disabled).toBe(false)
  })

  it("can show the install button disabled when an install is not possible", () => {
    render(<InstallCommand {...props({ canInstall: false })} />)

    expect(button("Install command")?.disabled).toBe(true)
  })

  it("can offer an update with the update label", () => {
    render(<InstallCommand {...props({ label: "Update command" })} />)

    expect(button("Update command")).not.toBeNull()
  })

  it("can show that the command is being installed", () => {
    render(<InstallCommand {...props({ canInstall: false, installing: true, label: "Installing" })} />)

    expect(button("Installing")?.disabled).toBe(true)
  })

  it("can render nothing when the command is already installed", () => {
    render(<InstallCommand {...props({ visible: false })} />)

    expect(button("Install command")).toBeNull()
  })
})
