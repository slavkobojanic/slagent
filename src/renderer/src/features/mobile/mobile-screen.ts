// The phone shows one screen at a time: the chat list, the open chat, or the chat's changes.
export type MobileScreen = "chats" | "chat" | "changes"

// The phone stacks screens. An iPad docks panes: all three side by side in landscape, and in
// portrait the sidebar beside a tab switcher over the chat, diff, plan and source file.
export type MobileLayout = "phone" | "landscape" | "portrait"

// Below this width (a phone, or an iPad in a narrow Split View) the stack is used.
export const TABLET_MIN_WIDTH = 700

export function layoutFor(width: number, height: number): MobileLayout {
  if (width < TABLET_MIN_WIDTH) {
    return "phone"
  }
  return width > height ? "landscape" : "portrait"
}
