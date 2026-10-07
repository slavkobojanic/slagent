import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { UninstallCommand, type UninstallCommandProps } from "@/features/settings/cli-settings/uninstall-command/uninstall-command"

function props(overrides: Partial<UninstallCommandProps> = {}): UninstallCommandProps {
  return {
    visible: true,
    canUninstall: true,
    label: "Uninstall",
    onUninstall: () => undefined,
    ...overrides,
  }
}

function button(name: string): HTMLButtonElement | null {
  return screen.queryByRole("button", { name }) as HTMLButtonElement | null
}

describe("UninstallCommand", () => {
  it("can offer to remove our command", () => {
    render(<UninstallCommand {...props()} />)

    expect(button("Uninstall")?.disabled).toBe(false)
  })

  it("can show that the command is being removed", () => {
    render(<UninstallCommand {...props({ canUninstall: false, label: "Removing" })} />)

    expect(button("Removing")?.disabled).toBe(true)
  })

  it("can render nothing when the command is not ours", () => {
    render(<UninstallCommand {...props({ visible: false })} />)

    expect(button("Uninstall")).toBeNull()
  })
})
