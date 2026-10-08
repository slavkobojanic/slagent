import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { EMPTY_PERSONALISATION } from "@shared/types"
import { PersonalisationSettings, type PersonalisationSettingsProps } from "@/features/settings/personalisation-settings/personalisation-settings"

function SaveSlot() {
  return <p>Save bar</p>
}

function props(overrides: Partial<PersonalisationSettingsProps> = {}): PersonalisationSettingsProps {
  return {
    draft: EMPTY_PERSONALISATION,
    onPatch: () => undefined,
    onPickFiles: () => Promise.resolve(),
    onRemoveFile: () => undefined,
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

  it("groups the fields under headings with a git workflow option", () => {
    render(<PersonalisationSettings {...props({ draft: { ...EMPTY_PERSONALISATION, gitWorkflow: "main" } })} />)

    expect(screen.getByText("How it talks")).not.toBeNull()
    expect(screen.getByText("Git")).not.toBeNull()
    expect(screen.getByText("When work is done")).not.toBeNull()
    expect(screen.getByText("Extra instructions")).not.toBeNull()
    expect(screen.getByText("Where it works")).not.toBeNull()
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

  it("can show an empty pinned files field with the total limit", () => {
    render(<PersonalisationSettings {...props()} />)

    expect(screen.getByText("Pinned context files")).not.toBeNull()
    expect(screen.getByPlaceholderText("No files pinned.")).not.toBeNull()
    expect(screen.getByText(/0 \/ 50,000 chars/)).not.toBeNull()
  })

  it("can show pinned files as read-only content with a chip to remove", () => {
    const draft = { ...EMPTY_PERSONALISATION, pinnedFiles: [{ name: "GUIDELINES.md", content: "Use tabs." }] }
    render(<PersonalisationSettings {...props({ draft })} />)

    expect(screen.getByText("GUIDELINES.md")).not.toBeNull()
    expect(screen.getByDisplayValue(/Use tabs\./)).not.toBeNull()
    expect(screen.getByText(/9 \/ 50,000 chars/)).not.toBeNull()
    expect(screen.getByLabelText("Remove GUIDELINES.md")).not.toBeNull()
  })

  it("can remove a pinned file through the chip", async () => {
    const onRemoveFile = vi.fn()
    const draft = { ...EMPTY_PERSONALISATION, pinnedFiles: [{ name: "GUIDELINES.md", content: "Use tabs." }] }
    render(<PersonalisationSettings {...props({ draft, onRemoveFile })} />)

    fireEvent.click(screen.getByLabelText("Remove GUIDELINES.md"))

    expect(onRemoveFile).toHaveBeenCalledWith("GUIDELINES.md")
  })
})
