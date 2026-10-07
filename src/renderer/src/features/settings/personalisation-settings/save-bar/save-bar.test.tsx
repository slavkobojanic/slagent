import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { SaveBar, type SaveBarProps } from "@/features/settings/personalisation-settings/save-bar/save-bar"

function props(overrides: Partial<SaveBarProps> = {}): SaveBarProps {
  return {
    dirty: false,
    saving: false,
    canSave: false,
    error: null,
    onSave: () => undefined,
    ...overrides,
  }
}

function saveButton(label: string): HTMLButtonElement | null {
  return screen.queryByRole("button", { name: label }) as HTMLButtonElement | null
}

describe("SaveBar", () => {
  it("can show save disabled and no unsaved note while nothing has changed", () => {
    render(<SaveBar {...props()} />)

    expect(saveButton("Save")?.disabled).toBe(true)
    expect(screen.queryByText("Unsaved changes")).toBeNull()
  })

  it("can show the unsaved note and enable save once a field differs", () => {
    render(<SaveBar {...props({ dirty: true, canSave: true })} />)

    expect(screen.getByText("Unsaved changes")).not.toBeNull()
    expect(saveButton("Save")?.disabled).toBe(false)
  })

  it("can show that a save is running", () => {
    render(<SaveBar {...props({ dirty: true, saving: true })} />)

    expect(saveButton("Saving")?.disabled).toBe(true)
  })

  it("can show the error from a failed save as an alert", () => {
    render(<SaveBar {...props({ dirty: true, canSave: true, error: "Disk full" })} />)

    expect(screen.getByRole("alert").textContent).toBe("Disk full")
  })
})
