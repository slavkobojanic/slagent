import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { MobileChatList, type MobileChatListProps } from "@/features/mobile/chat-list/chat-list"
import { chat } from "@/storybook/sample"

const noop = () => undefined

function BannerSlot() {
  return <p>Banner</p>
}

function props(overrides: Partial<MobileChatListProps> = {}): MobileChatListProps {
  return {
    groups: [
      { id: "chats", name: "Chats", newChatProjectId: null, items: [{ chat: chat({ id: "c1", title: "Plan the trip" }), projectId: "p0", status: "idle" }] },
      { id: "p1", name: "slagent", newChatProjectId: "p1", items: [] },
    ],
    empty: false,
    ready: true,
    opening: null,
    error: null,
    onOpenChat: noop,
    onNewChat: noop,
    onOpenConnection: noop,
    onDismissError: noop,
    Banner: BannerSlot,
    ...overrides,
  }
}

describe("MobileChatList", () => {
  it("can list each group with its chats when the library has some", () => {
    render(<MobileChatList {...props()} />)

    expect(screen.getByRole("region", { name: "Chats" })).not.toBeNull()
    expect(screen.getByText("Plan the trip")).not.toBeNull()
    expect(screen.getByRole("button", { name: "New chat in slagent" })).not.toBeNull()
    expect(screen.getByText("No chats yet")).not.toBeNull()
    expect(screen.getByText("Banner")).not.toBeNull()
  })

  it("can show loading when the snapshot has not arrived", () => {
    render(<MobileChatList {...props({ ready: false })} />)

    expect(screen.getByText("Loading chats…")).not.toBeNull()
  })

  it("can offer a new chat when there are no projects", () => {
    render(<MobileChatList {...props({ empty: true, groups: [] })} />)

    expect(screen.getByText(/No chats yet. Open a folder/)).not.toBeNull()
  })

  it("can show an error as an alert when opening failed", () => {
    render(<MobileChatList {...props({ error: "Chat not found" })} />)

    expect(screen.getByRole("alert").textContent).toBe("Chat not found")
  })
})
