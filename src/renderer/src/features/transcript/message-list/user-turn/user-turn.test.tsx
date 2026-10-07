import { describe, expect, it } from "vitest"
import type { UserMessage } from "@shared/types"
import { UserTurn, type UserTurnProps } from "@/features/transcript/message-list/user-turn/user-turn"
import { viewMarkup } from "@/test/view-markup"

const noop = () => undefined

function message(overrides: Partial<UserMessage> = {}): UserMessage {
  return { id: "u1", role: "user", text: "Fix the build", attachments: [], entryId: "entry-1", checkpoint: true, ...overrides }
}

function props(overrides: Partial<UserTurnProps> = {}): UserTurnProps {
  return {
    message: message(),
    editable: false,
    confirming: false,
    onEdit: noop,
    onRewind: noop,
    onOpenFile: noop,
    onConfirmEdit: noop,
    onCancelConfirm: noop,
    ...overrides,
  }
}

describe("UserTurn", () => {
  it("shows the message text without edit or rewind actions when it cannot be edited", () => {
    const markup = viewMarkup(<UserTurn {...props()} />)

    expect(markup).toContain("Fix the build")
    expect(markup).not.toContain("Edit and resend")
  })

  it("shows the edit and rewind actions for an editable message", () => {
    const markup = viewMarkup(<UserTurn {...props({ editable: true })} />)

    expect(markup).toContain("Edit and resend")
    expect(markup).toContain("Rewind")
  })

  it("shows the attachments, the replies and the diff comments the message carried", () => {
    const markup = viewMarkup(
      <UserTurn
        {...props({
          message: message({
            attachments: [{ id: "f1", name: "notes.txt", kind: "file" }],
            replies: [{ id: "r1", messageId: "a1", block: "Plan", quote: "Quoted words", text: "Reply text" }],
            comments: [{ id: "c1", path: "src/app.ts", line: 4, side: "new", code: "const a = 1", text: "Rename this" }],
          }),
        })}
      />,
    )

    expect(markup).toContain("notes.txt")
    expect(markup).toContain("Quoted words")
    expect(markup).toContain("Reply text")
    expect(markup).toContain("src/app.ts:4")
    expect(markup).toContain("Rename this")
  })

  it("shows an image attachment as an image", () => {
    const markup = viewMarkup(
      <UserTurn {...props({ message: message({ attachments: [{ id: "i1", name: "shot.png", kind: "image", url: "data:image/png;base64,AA" }] }) })} />,
    )

    expect(markup).toContain('alt="shot.png"')
  })
})
