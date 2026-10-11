import type { ComponentType } from "react"
import type { MobileLayout, MobileScreen } from "@/features/mobile/mobile-screen"
import { ScreenTransition } from "@/features/mobile/screen-transition/screen-transition"

export type MobileShellProps = {
  layout?: MobileLayout
  Tablet?: ComponentType
  screen: MobileScreen
  current: MobileScreen
  leaving: MobileScreen | null
  direction: "push" | "pop"
  entering: boolean
  onScreenChange: (screen: MobileScreen) => void
  ChatList: ComponentType
  ChatScreen: ComponentType
  ChangesScreen: ComponentType
  ConnectionSheet: ComponentType
  BackSwipe: ComponentType
}

export function MobileShell({ layout = "phone", Tablet, screen, current, leaving, direction, entering, onScreenChange, ChatList, ChatScreen, ChangesScreen, ConnectionSheet, BackSwipe }: MobileShellProps) {
  if (layout !== "phone" && Tablet !== undefined) {
    return (
      <div className="h-full bg-background text-foreground">
        <Tablet />
      </div>
    )
  }
  return (
    <div className="h-full bg-background text-foreground">
      <ScreenTransition screen={screen} current={current} leaving={leaving} direction={direction} entering={entering} onScreenChange={onScreenChange} ChatList={ChatList} ChatScreen={ChatScreen} ChangesScreen={ChangesScreen} />
      <ConnectionSheet />
      <BackSwipe />
    </div>
  )
}
