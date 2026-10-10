import { afterEach, describe, expect, it, vi } from "vitest"
import { act, render, screen } from "@testing-library/react"
import { MobileShell } from "@/features/mobile/mobile-shell"

function named(label: string) {
  return function Named() {
    return <p>{label}</p>
  }
}

function shell(screen: "chats" | "chat" | "changes") {
  return <MobileShell screen={screen} ChatList={named("ChatList")} ChatScreen={named("ChatScreen")} ChangesScreen={named("ChangesScreen")} ConnectionSheet={named("ConnectionSheet")} BackSwipe={named("BackSwipe")} />
}

describe("MobileShell", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("can show the chat list when no chat is open", () => {
    render(shell("chats"))

    expect(screen.getByText("ChatList")).not.toBeNull()
    expect(screen.queryByText("ChatScreen")).toBeNull()
    expect(screen.getByText("ConnectionSheet")).not.toBeNull()
    expect(screen.getByText("BackSwipe")).not.toBeNull()
  })

  it("can show the chat when one is open", () => {
    render(shell("chat"))

    expect(screen.getByText("ChatScreen")).not.toBeNull()
    expect(screen.queryByText("ChatList")).toBeNull()
  })

  it("can show the chat's changes", () => {
    render(shell("changes"))

    expect(screen.getByText("ChangesScreen")).not.toBeNull()
    expect(screen.queryByText("ChatScreen")).toBeNull()
  })

  it("pushes the changes over the chat, then pops back to the chat", () => {
    vi.useFakeTimers()
    const { rerender } = render(shell("chat"))
    rerender(shell("changes"))

    expect(screen.getByText("ChangesScreen")).not.toBeNull()
    expect(screen.getByText("ChatScreen")).not.toBeNull()

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.queryByText("ChatScreen")).toBeNull()
    expect(screen.getByText("ChangesScreen")).not.toBeNull()

    rerender(shell("chat"))
    expect(screen.getByText("ChangesScreen")).not.toBeNull()
    expect(screen.getByText("ChatScreen")).not.toBeNull()

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.queryByText("ChangesScreen")).toBeNull()
    expect(screen.getByText("ChatScreen")).not.toBeNull()
  })

  it("keeps the leaving screen mounted while the push plays", () => {
    vi.useFakeTimers()
    const { rerender } = render(shell("chats"))
    rerender(shell("chat"))

    // Both screens exist for the length of the push, the chat on top.
    expect(screen.getByText("ChatScreen")).not.toBeNull()
    expect(screen.getByText("ChatList")).not.toBeNull()

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.queryByText("ChatList")).toBeNull()
    expect(screen.getByText("ChatScreen")).not.toBeNull()
  })

  it("keeps the chat mounted while the pop plays, then drops it", () => {
    vi.useFakeTimers()
    const { rerender } = render(shell("chat"))
    rerender(shell("chats"))

    expect(screen.getByText("ChatScreen")).not.toBeNull()
    expect(screen.getByText("ChatList")).not.toBeNull()

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.queryByText("ChatScreen")).toBeNull()
    expect(screen.getByText("ChatList")).not.toBeNull()
  })

  it("can show the tablet layout instead of the stack", () => {
    render(
      <MobileShell layout="landscape" Tablet={named("Tablet")} screen="chats" ChatList={named("ChatList")} ChatScreen={named("ChatScreen")} ChangesScreen={named("ChangesScreen")} ConnectionSheet={named("ConnectionSheet")} BackSwipe={named("BackSwipe")} />,
    )

    expect(screen.getByText("Tablet")).not.toBeNull()
    expect(screen.queryByText("ChatList")).toBeNull()
    expect(screen.queryByText("BackSwipe")).toBeNull()
  })
})
