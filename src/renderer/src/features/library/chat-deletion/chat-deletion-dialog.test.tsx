import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ChatDeletionDialog } from "@/features/library/chat-deletion/chat-deletion-dialog"

const noop = () => undefined

describe("ChatDeletionDialog", () => {
  it("can show the chat's title and the delete action while open", () => {
    render(<ChatDeletionDialog open chatTitle="Plan" busy={false} onCancel={noop} onConfirm={noop} />)

    expect(screen.queryByRole("heading", { name: "Delete chat" })).not.toBeNull()
    expect(screen.queryByText("Plan")).not.toBeNull()
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeNull()
  })

  it("can show nothing when closed", () => {
    render(<ChatDeletionDialog open={false} chatTitle="" busy={false} onCancel={noop} onConfirm={noop} />)

    expect(screen.queryByRole("heading", { name: "Delete chat" })).toBeNull()
  })

  it("can show the deleting label and disable the action while the delete runs", () => {
    render(<ChatDeletionDialog open chatTitle="Plan" busy onCancel={noop} onConfirm={noop} />)

    const action = screen.getByRole("button", { name: "Deleting" })

    expect(action.hasAttribute("disabled")).toBe(true)
  })
})
