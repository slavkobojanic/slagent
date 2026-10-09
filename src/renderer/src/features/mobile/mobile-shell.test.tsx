import { afterEach, describe, expect, it, vi } from "vitest"
import { act, render, screen } from "@testing-library/react"
import { MobileShell } from "@/features/mobile/mobile-shell"

function named(label: string) {
  return function Named() {
    return <p>{label}</p>
  }
}

function shell(screen: "chats" | "chat") {
  return <MobileShell screen={screen} ChatList={named("ChatList")} ChatScreen={named("ChatScreen")} ConnectionSheet={named("ConnectionSheet")} />
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
  })

  it("can show the chat when one is open", () => {
    render(shell("chat"))

    expect(screen.getByText("ChatScreen")).not.toBeNull()
    expect(screen.queryByText("ChatList")).toBeNull()
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
})
