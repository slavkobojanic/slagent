import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { MobileShell } from "@/features/mobile/mobile-shell"

function named(label: string) {
  return function Named() {
    return <p>{label}</p>
  }
}

describe("MobileShell", () => {
  it("can show the chat list when no chat is open", () => {
    render(<MobileShell screen="chats" ChatList={named("ChatList")} ChatScreen={named("ChatScreen")} ConnectionSheet={named("ConnectionSheet")} />)

    expect(screen.getByText("ChatList")).not.toBeNull()
    expect(screen.queryByText("ChatScreen")).toBeNull()
    expect(screen.getByText("ConnectionSheet")).not.toBeNull()
  })

  it("can show the chat when one is open", () => {
    render(<MobileShell screen="chat" ChatList={named("ChatList")} ChatScreen={named("ChatScreen")} ConnectionSheet={named("ConnectionSheet")} />)

    expect(screen.getByText("ChatScreen")).not.toBeNull()
    expect(screen.queryByText("ChatList")).toBeNull()
  })
})
