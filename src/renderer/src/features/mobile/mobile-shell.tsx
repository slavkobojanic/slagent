import type { ComponentType } from "react"
import type { MobileScreen } from "@/features/mobile/mobile-screen"
import { ScreenTransition } from "@/features/mobile/screen-transition/screen-transition"

export type MobileShellProps = {
  screen: MobileScreen
  ChatList: ComponentType
  ChatScreen: ComponentType
  ConnectionSheet: ComponentType
  BackSwipe: ComponentType
}

export function MobileShell({ screen, ChatList, ChatScreen, ConnectionSheet, BackSwipe }: MobileShellProps) {
  return (
    <div className="h-full bg-background text-foreground">
      <ScreenTransition screen={screen} ChatList={ChatList} ChatScreen={ChatScreen} />
      <ConnectionSheet />
      <BackSwipe />
    </div>
  )
}
