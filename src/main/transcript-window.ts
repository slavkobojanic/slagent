import type { ChatMessage } from "../shared/types"

// Turns shown when a chat opens and added per page while scrolling.
const PAGE_TURNS = 40
// Turns kept at once; paging past this trims the far end.
const MAX_TURNS = 120

// The slice of a chat the renderer sees. Bounds are message ids rather than indices so
// they survive messages being appended; a bound that disappears (rewind, edit) resets
// the window to the tail.
//   start: first message shown, or null for the last PAGE_TURNS turns.
//   end: first message past the window, or null to follow the tail.
export type TranscriptWindow = { start: string | null; end: string | null }

export const tailWindow: TranscriptWindow = { start: null, end: null }

export type WindowSlice = {
  messages: ChatMessage[]
  windowStart: number
  hasOlder: boolean
  hasNewer: boolean
}

// Index of the first message of each turn. A turn starts at a user message, and any
// messages before the first user message form a turn of their own.
function turnStarts(messages: ChatMessage[]): number[] {
  const starts: number[] = []
  for (let index = 0; index < messages.length; index += 1) {
    if (messages[index].role === "user" || index === 0) starts.push(index)
  }
  return starts
}

// Positions in `starts` of the window's first turn and first turn past it, or null
// when a bound no longer exists.
function resolve(messages: ChatMessage[], starts: number[], window: TranscriptWindow): { from: number; to: number } | null {
  const position = (id: string) => {
    const index = messages.findIndex((message) => message.id === id)
    if (index < 0) return -1
    return starts.indexOf(index)
  }
  let from = Math.max(0, starts.length - PAGE_TURNS)
  let to = starts.length
  if (window.start !== null) {
    from = position(window.start)
    if (from < 0) return null
  }
  if (window.end !== null) {
    to = position(window.end)
    if (to < 0) return null
  }
  return { from, to }
}

function bounds(messages: ChatMessage[], starts: number[], from: number, to: number): TranscriptWindow {
  // The default tail stays unpinned so it keeps sliding as new turns arrive.
  if (to === starts.length && from === Math.max(0, starts.length - PAGE_TURNS)) return tailWindow
  let end: string | null = null
  if (to < starts.length) end = messages[starts[to]].id
  return { start: messages[starts[from]].id, end }
}

export function sliceWindow(messages: ChatMessage[], window: TranscriptWindow): WindowSlice {
  const starts = turnStarts(messages)
  const range = resolve(messages, starts, window) ?? resolve(messages, starts, tailWindow)!
  const first = starts[range.from] ?? 0
  const last = starts[range.to] ?? messages.length
  return {
    messages: messages.slice(first, last),
    windowStart: first,
    hasOlder: range.from > 0,
    hasNewer: range.to < starts.length,
  }
}

export function olderWindow(messages: ChatMessage[], window: TranscriptWindow): TranscriptWindow {
  const starts = turnStarts(messages)
  const range = resolve(messages, starts, window) ?? resolve(messages, starts, tailWindow)!
  const from = Math.max(0, range.from - PAGE_TURNS)
  const to = Math.min(range.to, from + MAX_TURNS)
  return bounds(messages, starts, from, to)
}

export function newerWindow(messages: ChatMessage[], window: TranscriptWindow): TranscriptWindow {
  const starts = turnStarts(messages)
  const range = resolve(messages, starts, window) ?? resolve(messages, starts, tailWindow)!
  const to = Math.min(starts.length, range.to + PAGE_TURNS)
  const from = Math.max(range.from, to - MAX_TURNS)
  return bounds(messages, starts, from, to)
}

// A window with the given message's turn near the middle, or null if it is not in the chat.
export function windowAround(messages: ChatMessage[], messageId: string): TranscriptWindow | null {
  const index = messages.findIndex((message) => message.id === messageId)
  if (index < 0) return null
  const starts = turnStarts(messages)
  let turn = 0
  while (turn + 1 < starts.length && starts[turn + 1] <= index) turn += 1
  const to = Math.min(starts.length, Math.max(turn + PAGE_TURNS / 2, PAGE_TURNS))
  const from = Math.max(0, to - PAGE_TURNS)
  return bounds(messages, starts, from, to)
}
