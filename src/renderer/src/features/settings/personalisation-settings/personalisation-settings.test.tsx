import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { EMPTY_PERSONALISATION } from "@shared/types"
import { PersonalisationSettings, type PersonalisationSettingsProps } from "@/features/settings/personalisation-settings/personalisation-settings"

function SaveSlot() {
  return <p>Save bar</p>
}

function props(overrides: Partial<PersonalisationSettingsProps> = {}): PersonalisationSettingsProps {
  return {
    draft: EMPTY_PERSONALISATION,
    onPatch: () => undefined,
    SaveBar: SaveSlot,
    ...overrides,
  }
}

describe("PersonalisationSettings", () => {
  it("can show the fields and the save bar", () => {
    render(<PersonalisationSettings {...props()} />)

    expect(screen.getByText("Tone")).not.toBeNull()
    expect(screen.getByText("Anything else")).not.toBeNull()
    expect(screen.getByText("Save bar")).not.toBeNull()
  })

  it("can show the draft notes in the notes field", () => {
    render(<PersonalisationSettings {...props({ draft: { ...EMPTY_PERSONALISATION, notes: "Use tabs." } })} />)

    expect(screen.getByDisplayValue("Use tabs.")).not.toBeNull()
  })

  it("can show the branch prefix field only for type-prefix branch names", () => {
    const { unmount } = render(<PersonalisationSettings {...props({ draft: { ...EMPTY_PERSONALISATION, branchNaming: "prefix" } })} />)

    expect(screen.getByText("Branch prefix")).not.toBeNull()
    unmount()
    render(<PersonalisationSettings {...props({ draft: { ...EMPTY_PERSONALISATION, branchNaming: "descriptive" } })} />)

    expect(screen.queryByText("Branch prefix")).toBeNull()
  })
})
