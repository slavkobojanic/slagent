import type { ComponentType } from "react"
import type { MobileScreen } from "@/features/mobile/mobile-screen"
import { cn } from "@/lib/utils"
import "@/features/mobile/screen-transition/screen-transition.css"

export type ScreenTransitionProps = {
  screen: MobileScreen
  ChatList: ComponentType
  ChatScreen: ComponentType
  ChangesScreen: ComponentType
  current: MobileScreen
  leaving: MobileScreen | null
  direction: "push" | "pop"
  entering: boolean
  onScreenChange: (screen: MobileScreen) => void
}

export function ScreenTransition({ screen, ChatList, ChatScreen, ChangesScreen, current, leaving, direction, entering, onScreenChange }: ScreenTransitionProps) {
  if (screen !== current) {
    onScreenChange(screen)
  }

  return (
    <div className="screen-stage">
      {leaving !== null && leaving !== current ? (
        <div className={cn("screen-layer", `screen-layer-${leaving}`, entering && `screen-layer-${direction}-exit`)}>
          <Screen name={leaving} ChatList={ChatList} ChatScreen={ChatScreen} ChangesScreen={ChangesScreen} />
        </div>
      ) : null}
      <div className={cn("screen-layer", `screen-layer-${current}`, entering && `screen-layer-${direction}-enter`)}>
        <Screen name={current} ChatList={ChatList} ChatScreen={ChatScreen} ChangesScreen={ChangesScreen} />
      </div>
    </div>
  )
}

function Screen({ name, ChatList, ChatScreen, ChangesScreen }: { name: MobileScreen; ChatList: ComponentType; ChatScreen: ComponentType; ChangesScreen: ComponentType }) {
  if (name === "chat") return <ChatScreen />
  if (name === "changes") return <ChangesScreen />
  return <ChatList />
}
