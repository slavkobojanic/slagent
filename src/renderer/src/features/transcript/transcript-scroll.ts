import type { TranscriptPage, TranscriptState } from "@shared/types"

// Distance from either end of the scroller at which the next page is requested.
export const PAGE_MARGIN = 800

type PageEdges = Pick<TranscriptState, "hasOlder" | "hasNewer">

// The page to request, given where the reader is. An edge is only asked for while it has more
// turns, and only once the reader is within PAGE_MARGIN of it. The top wins when both qualify.
export function nextPage(edges: PageEdges, scrollTop: number, fromBottom: number): TranscriptPage | null {
  if (edges.hasOlder && scrollTop < PAGE_MARGIN) {
    return "older"
  }
  if (edges.hasNewer && fromBottom < PAGE_MARGIN) {
    return "newer"
  }
  return null
}

// A message on screen and its offset from the scroller top, so the same message can be held
// in place while the window moves. Null when nothing is on screen.
export function visibleMessage(scroller: HTMLElement): { id: string; top: number } | null {
  const top = scroller.getBoundingClientRect().top
  for (const element of scroller.querySelectorAll<HTMLElement>("[data-message-id]")) {
    const box = element.getBoundingClientRect()
    if (box.bottom > top) {
      return { id: element.dataset.messageId ?? "", top: box.top - top }
    }
  }
  return null
}

export function findMessage(root: ParentNode, messageId: string): HTMLElement | null {
  for (const element of root.querySelectorAll<HTMLElement>("[data-message-id]")) {
    if (element.dataset.messageId === messageId) {
      return element
    }
  }
  return null
}
