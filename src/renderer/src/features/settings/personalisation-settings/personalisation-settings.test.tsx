import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { EMPTY_PERSONALISATION } from "@shared/types"
import { PersonalisationSettings, type PersonalisationSettingsProps } from "@/features/settings/personalisation-settings/personalisation-settings"

function props(overrides: Partial<PersonalisationSettingsProps> = {}): PersonalisationSettingsProps {
  return {
    draft: EMPTY_PERSONALISATION,
    dirty: false,
    saving: false,
    canSave: false,
    error: null,
    onPatch: () => undefined,
    onSave: () => undefined,
    ...overrides,
  }
}

function saveButton(label: string): HTMLButtonElement | null {
  return screen.queryByRole("button", { name: label }) as HTMLButtonElement | null
}

describe("PersonalisationSettings", () => {
  it("can show save disabled and no unsaved note while nothing has changed", () => {
    render(<PersonalisationSettings {...props()} />)

    expect(saveButton("Save")?.disabled).toBe(true)
    expect(screen.queryByText("Unsaved changes")).toBeNull()
  })

  it("can show the unsaved note and enable save once a field differs", () => {
    render(<PersonalisationSettings {...props({ draft: { ...EMPTY_PERSONALISATION, notes: "Use tabs." }, dirty: true, canSave: true })} />)

    expect(screen.getByText("Unsaved changes")).not.toBeNull()
    expect(saveButton("Save")?.disabled).toBe(false)
  })

  it("can show that a save is running", () => {
    render(<PersonalisationSettings {...props({ dirty: true, saving: true })} />)

    expect(saveButton("Saving")?.disabled).toBe(true)
  })

  it("can show the branch prefix field only for type-prefix branch names", () => {
    const { unmount } = render(<PersonalisationSettings {...props({ draft: { ...EMPTY_PERSONALISATION, branchNaming: "prefix" } })} />)

    expect(screen.getByText("Branch prefix")).not.toBeNull()
    unmount()
    render(<PersonalisationSettings {...props({ draft: { ...EMPTY_PERSONALISATION, branchNaming: "descriptive" } })} />)

    expect(screen.queryByText("Branch prefix")).toBeNull()
  })

  it("can show the error from a failed save as an alert", () => {
    render(<PersonalisationSettings {...props({ dirty: true, canSave: true, error: "Disk full" })} />)

    expect(screen.getByRole("alert").textContent).toBe("Disk full")
  })
})
