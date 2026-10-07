import { AnimatePresence, motion } from "motion/react"
import type { ComponentType } from "react"
import type { ChatSummary } from "@shared/types"

export type ChatListProps = {
  chats: ChatSummary[]
  empty: boolean
  hasHidden: boolean
  reduceMotion: boolean
  ChatRow: ComponentType<{ chat: ChatSummary }>
  Footer: ComponentType
}

const ROW_TRANSITION = { duration: 0.22, ease: [0.23, 1, 0.32, 1] as const }
const INSTANT_TRANSITION = { duration: 0 }

export function ChatList({ chats, empty, hasHidden, reduceMotion, ChatRow, Footer }: ChatListProps) {
  return (
    <>
      {empty ? <p className="ml-3 px-2 py-1 text-sm text-foreground/40">No chats yet</p> : null}
      <div className="relative">
        <AnimatePresence initial={false}>
          {chats.map((chat) => (
            <motion.div
              key={chat.id}
              layout="position"
              className="overflow-hidden pb-1"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={reduceMotion ? INSTANT_TRANSITION : ROW_TRANSITION}
            >
              <ChatRow chat={chat} />
            </motion.div>
          ))}
        </AnimatePresence>
        {hasHidden ? <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-background" /> : null}
      </div>
      <Footer />
    </>
  )
}
