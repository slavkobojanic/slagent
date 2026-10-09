import { useEffect, useState } from "react"
import type { ComponentType } from "react"
import type { MobileScreen } from "@/features/mobile/mobile-screen"
import { cn } from "@/lib/utils"
import "@/features/mobile/screen-transition/screen-transition.css"

// Must match the animation durations in screen-transition.css.
const PUSH_MS = 250
const POP_MS = 200

type Direction = "push" | "pop"

// Deeper screens sit above shallower ones: chats < chat < changes.
const DEPTH: Record<MobileScreen, number> = { chats: 0, chat: 1, changes: 2 }

export type ScreenTransitionProps = {
  screen: MobileScreen
  ChatList: ComponentType
  ChatScreen: ComponentType
  ChangesScreen: ComponentType
}

// The push/pop between the three screens. The outgoing screen stays mounted
// beneath the incoming one for the length of the animation, then unmounts; the
// layers animate with CSS only. The first screen of a session appears directly,
// without motion.
export function ScreenTransition({ screen, ChatList, ChatScreen, ChangesScreen }: ScreenTransitionProps) {
  const [state, setState] = useState(() => ({ current: screen, leaving: null as MobileScreen | null, direction: "push" as Direction, entering: false }))

  useEffect(() => {
    setState((prev) => {
      if (prev.current === screen) return prev
      const direction: Direction = DEPTH[screen] > DEPTH[prev.current] ? "push" : "pop"
      return { current: screen, leaving: prev.current, direction, entering: true }
    })
  }, [screen])

  // Drops the leaving screen once its exit animation has played.
  useEffect(() => {
    if (state.leaving === null) return
    const ms = state.direction === "push" ? PUSH_MS : POP_MS
    const id = window.setTimeout(() => {
      setState((prev) => ({ ...prev, leaving: null, entering: false }))
    }, ms)
    return () => window.clearTimeout(id)
  }, [state.leaving, state.direction])

  const { current, leaving, direction, entering } = state

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
