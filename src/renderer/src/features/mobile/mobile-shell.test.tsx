import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { MobileShell } from "@/features/mobile/mobile"

function named(label: string) {
  return function Named() {
    return <p>{label}</p>
  }
}

function shell(screen: "chats" | "chat" | "changes", onScreenChange = () => undefined) {
  return (
    <MobileShell
      screen={screen}
      current={screen}
      leaving={null}
      direction="push"
      entering={false}
      onScreenChange={onScreenChange}
      ChatList={named("ChatList")}
      ChatScreen={named("ChatScreen")}
      ChangesScreen={named("ChangesScreen")}
      ConnectionSheet={named("ConnectionSheet")}
      BackSwipe={named("BackSwipe")}
    />
  )
}

describe("MobileShell", () => {
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

  it("can show the tablet layout instead of the stack", () => {
    render(
      <MobileShell
        layout="landscape"
        Tablet={named("Tablet")}
        screen="chats"
        current="chats"
        leaving={null}
        direction="push"
        entering={false}
        onScreenChange={() => undefined}
        ChatList={named("ChatList")}
        ChatScreen={named("ChatScreen")}
        ChangesScreen={named("ChangesScreen")}
        ConnectionSheet={named("ConnectionSheet")}
        BackSwipe={named("BackSwipe")}
      />,
    )

    expect(screen.getByText("Tablet")).not.toBeNull()
    expect(screen.queryByText("ChatList")).toBeNull()
    expect(screen.queryByText("BackSwipe")).toBeNull()
  })
})
