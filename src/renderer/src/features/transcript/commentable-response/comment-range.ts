import { normalize } from "@/features/transcript/commentable-response/comment-text"

// NodeFilter.SHOW_TEXT, written out so the function reads no global.
const SHOW_TEXT = 0x4

// Finds the rendered words of `quote` inside `root`, preferring the occurrence nearest `at`, an
// offset into the root's normalized text. The document is the root's own, so nothing global is read.
export function findRange(root: HTMLElement, quote: string, at = 0): Range | null {
  const target = normalize(quote)
  if (!target) {
    return null
  }
  const doc = root.ownerDocument
  const walker = doc.createTreeWalker(root, SHOW_TEXT)
  const nodes: Text[] = []
  const starts: number[] = []
  let full = ""
  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    nodes.push(node)
    starts.push(full.length)
    full += node.data
  }
  // The normalized text, with the raw index each of its characters came from.
  let flat = ""
  const raw: number[] = []
  for (let index = 0; index < full.length; index++) {
    const char = full[index] ?? ""
    if (/\s/.test(char)) {
      if (flat === "" || flat.endsWith(" ")) {
        continue
      }
      flat += " "
    } else {
      flat += char
    }
    raw.push(index)
  }
  let best = -1
  for (let found = flat.indexOf(target); found !== -1; found = flat.indexOf(target, found + 1)) {
    if (best === -1 || Math.abs(found - at) < Math.abs(best - at)) {
      best = found
    }
  }
  if (best === -1) {
    return null
  }
  const first = raw[best]
  const last = raw[best + target.length - 1]
  if (first === undefined || last === undefined) {
    return null
  }
  const range = doc.createRange()
  const place = (index: number, edge: "start" | "end") => {
    let node = 0
    while (node + 1 < starts.length && (starts[node + 1] ?? 0) <= index) {
      node++
    }
    const text = nodes[node]
    if (!text) {
      return
    }
    const offset = index - (starts[node] ?? 0)
    if (edge === "start") {
      range.setStart(text, offset)
    } else {
      range.setEnd(text, offset + 1)
    }
  }
  place(first, "start")
  place(last, "end")
  return range
}
