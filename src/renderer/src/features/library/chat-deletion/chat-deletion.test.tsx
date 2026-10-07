import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ChatDeletion } from "@/features/library/chat-deletion/chat-deletion"

const noop = () => undefined

describe("ChatDeletion", () => {
  it("can show the chat's title and the delete action while open", () => {
    render(<ChatDeletion open chatTitle="Plan" busy={false} onCancel={noop} onConfirm={noop} />)

    expect(screen.queryByRole("heading", { name: "Delete chat" })).not.toBeNull()
    expect(screen.queryByText("Plan")).not.toBeNull()
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeNull()
  })

  it("can show nothing when closed", () => {
    render(<ChatDeletion open={false} chatTitle="" busy={false} onCancel={noop} onConfirm={noop} />)

    expect(screen.queryByRole("heading", { name: "Delete chat" })).toBeNull()
  })

  it("can show the deleting label and disable the action while the delete runs", () => {
    render(<ChatDeletion open chatTitle="Plan" busy onCancel={noop} onConfirm={noop} />)

    const action = screen.getByRole("button", { name: "Deleting" })

    expect(action.hasAttribute("disabled")).toBe(true)
  })
})
