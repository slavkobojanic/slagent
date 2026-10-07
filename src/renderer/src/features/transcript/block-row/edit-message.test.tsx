import { describe, expect, it } from "vitest"
import { EditMessage, type EditMessageProps } from "@/features/transcript/block-row/edit-message"
import { viewMarkup } from "@/test/view-markup"

const noop = () => undefined

function props(overrides: Partial<EditMessageProps> = {}): EditMessageProps {
  return { draft: "Fix the build", canSave: true, saving: false, onDraftChange: noop, onCancel: noop, onSave: noop, ...overrides }
}

describe("EditMessage", () => {
  it("shows the draft with Send enabled when the draft can be sent", () => {
    const markup = viewMarkup(<EditMessage {...props()} />)

    expect(markup).toContain("Fix the build")
    expect(markup).toMatch(/<button[^>]*>Send<\/button>/)
    expect(markup).not.toMatch(/disabled=""[^>]*>Send/)
  })

  it("disables Send while the draft is blank", () => {
    const markup = viewMarkup(<EditMessage {...props({ draft: "  ", canSave: false })} />)

    expect(markup).toMatch(/disabled=""[^>]*>Send/)
  })

  it("disables Cancel while the edit is being sent", () => {
    const markup = viewMarkup(<EditMessage {...props({ saving: true, canSave: false })} />)

    expect(markup).toMatch(/disabled=""[^>]*>Cancel/)
  })
})
