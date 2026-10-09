import type { ComponentType } from "react"
import type { MobileScreen } from "@/features/mobile/mobile-screen"

export type MobileShellProps = {
  screen: MobileScreen
  ChatList: ComponentType
  ChatScreen: ComponentType
  ConnectionSheet: ComponentType
}

export function MobileShell({ screen, ChatList, ChatScreen, ConnectionSheet }: MobileShellProps) {
  return (
    <div className="h-full bg-background text-foreground">
      {screen === "chat" ? <ChatScreen /> : <ChatList />}
      <ConnectionSheet />
    </div>
  )
}
