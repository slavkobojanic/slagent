import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { KeyActions, type KeyActionsProps } from "@/features/settings/openrouter-key/key-actions/key-actions"

function props(overrides: Partial<KeyActionsProps> = {}): KeyActionsProps {
  return {
    canSave: false,
    saving: false,
    canRemove: false,
    removing: false,
    oauth: false,
    onCreateKey: () => undefined,
    onRemove: () => undefined,
    ...overrides,
  }
}

function button(name: string): HTMLButtonElement | null {
  return screen.queryByRole("button", { name }) as HTMLButtonElement | null
}

describe("KeyActions", () => {
  it("can show save disabled and no remove action when nothing is configured", () => {
    render(<KeyActions {...props()} />)

    expect(button("Save key")?.disabled).toBe(true)
    expect(button("Create a key")).not.toBeNull()
    expect(button("Remove saved key")).toBeNull()
  })

  it("can show that a save is running", () => {
    render(<KeyActions {...props({ saving: true })} />)

    expect(button("Saving")?.disabled).toBe(true)
  })

  it("can offer to remove a key saved in slagent", () => {
    render(<KeyActions {...props({ canRemove: true })} />)

    expect(button("Remove saved key")?.disabled).toBe(false)
  })

  it("can offer sign out for a Pi sign-in", () => {
    render(<KeyActions {...props({ canRemove: true, oauth: true })} />)

    expect(button("Sign out")).not.toBeNull()
  })

  it("can show that a removal is running", () => {
    render(<KeyActions {...props({ canRemove: true, removing: true })} />)

    expect(button("Removing")?.disabled).toBe(true)
  })
})
