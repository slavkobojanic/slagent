import { DONE_WINDOW_MS, type ChatStatus, type ChatSummary } from "@shared/types"

// "done" shows for DONE_WINDOW_MS after the chat finished, then falls back to idle.
export function chatDisplayStatus(chat: ChatSummary, now: number): ChatStatus {
  if (chat.status === "done" && chat.finishedAt !== null && now >= chat.finishedAt + DONE_WINDOW_MS) {
    return "idle"
  }
  return chat.status
}

// The earliest moment after now when a done chat falls back to idle, or null when none is pending.
export function nextDoneExpiry(chats: ChatSummary[], now: number): number | null {
  let next: number | null = null
  for (const chat of chats) {
    if (chat.status !== "done" || chat.finishedAt === null) {
      continue
    }
    const expiry = chat.finishedAt + DONE_WINDOW_MS
    if (expiry <= now) {
      continue
    }
    if (next === null || expiry < next) {
      next = expiry
    }
  }
  return next
}
