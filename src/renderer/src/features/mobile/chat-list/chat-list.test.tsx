import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { MobileChatList, type MobileChatListProps } from "@/features/mobile/chat-list/chat-list"
import type { ChatGroupView } from "@/features/mobile/chat-list/chat-list-items"
import { chat } from "@/storybook/sample"

const noop = () => undefined

function BannerSlot() {
  return <p>Banner</p>
}

function MacPickerSlot() {
  return <p>MacPicker</p>
}

function group(overrides: Partial<ChatGroupView> = {}): ChatGroupView {
  return { id: "chats", name: "Chats", newChatProjectId: null, items: [], hiddenCount: 0, showAll: false, canShowLess: false, ...overrides }
}

function props(overrides: Partial<MobileChatListProps> = {}): MobileChatListProps {
  return {
    groups: [
      group({ items: [{ chat: chat({ id: "c1", title: "Plan the trip" }), projectId: "p0", status: "idle" }] }),
      group({ id: "p1", name: "slagent", newChatProjectId: "p1" }),
    ],
    empty: false,
    ready: true,
    opening: null,
    error: null,
    onOpenChat: noop,
    onNewChat: noop,
    onOpenConnection: noop,
    onDismissError: noop,
    onToggleShowAll: noop,
    MacPicker: MacPickerSlot,
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
    expect(screen.getByText("MacPicker")).not.toBeNull()
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

  it("can offer the chats past the cap under their group", () => {
    render(<MobileChatList {...props({ groups: [group({ items: [{ chat: chat({ id: "c1" }), projectId: "p0", status: "idle" }], hiddenCount: 3 })], onToggleShowAll: noop })} />)

    expect(screen.getByRole("button", { name: "Show 3 more" })).not.toBeNull()
  })

  it("can reveal the rest of a group when Show more is tapped", () => {
    const onToggleShowAll = vi.fn()
    render(<MobileChatList {...props({ groups: [group({ items: [{ chat: chat({ id: "c1" }), projectId: "p0", status: "idle" }], hiddenCount: 3 })], onToggleShowAll })} />)

    fireEvent.click(screen.getByRole("button", { name: "Show 3 more" }))

    expect(onToggleShowAll).toHaveBeenCalledWith("chats")
  })

  it("can hide the group again once its whole list is showing", () => {
    render(<MobileChatList {...props({ groups: [group({ items: [{ chat: chat({ id: "c1" }), projectId: "p0", status: "idle" }], showAll: true, canShowLess: true })], onToggleShowAll: noop })} />)

    expect(screen.getByRole("button", { name: "Show less" })).not.toBeNull()
    expect(screen.queryByRole("button", { name: /Show \d+ more/ })).toBeNull()
  })
})
