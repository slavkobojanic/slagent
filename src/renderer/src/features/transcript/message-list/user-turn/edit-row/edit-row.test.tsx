import { describe, expect, it } from "vitest"
import { EditRow, type EditRowProps } from "@/features/transcript/message-list/user-turn/edit-row/edit-row"
import { viewMarkup } from "@/test/view-markup"

const noop = () => undefined

function props(overrides: Partial<EditRowProps> = {}): EditRowProps {
  return { draft: "Fix the build", canSave: true, saving: false, onDraftChange: noop, onCancel: noop, onSave: noop, ...overrides }
}

describe("EditRow", () => {
  it("shows the draft with Send enabled when the draft can be sent", () => {
    const markup = viewMarkup(<EditRow {...props()} />)

    expect(markup).toContain("Fix the build")
    expect(markup).toMatch(/<button[^>]*>Send<\/button>/)
    expect(markup).not.toMatch(/disabled=""[^>]*>Send/)
  })

  it("disables Send while the draft is blank", () => {
    const markup = viewMarkup(<EditRow {...props({ draft: "  ", canSave: false })} />)

    expect(markup).toMatch(/disabled=""[^>]*>Send/)
  })

  it("disables Cancel while the edit is being sent", () => {
    const markup = viewMarkup(<EditRow {...props({ saving: true, canSave: false })} />)

    expect(markup).toMatch(/disabled=""[^>]*>Cancel/)
  })
})
