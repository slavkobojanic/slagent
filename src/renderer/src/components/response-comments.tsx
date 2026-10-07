import { HighlighterIcon, MessageSquarePlusIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react"
import { parseMarkdownIntoBlocks } from "streamdown"
import type { ReplyComment } from "@shared/types"
import { MessageResponse } from "@/components/ai-elements/message"
import { CommentDraft } from "@/components/comment-draft"
import { Button } from "@/components/ui/button"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { cn } from "@/lib/utils"

type ReplyState = {
  replies: ReplyComment[]
  onReplies: Dispatch<SetStateAction<ReplyComment[]>>
}

// Pending comments on response blocks; without a provider responses are not commentable.
const ReplyCommentsContext = createContext<ReplyState | null>(null)

const LIST_ITEM = /^( {0,3})([-*+]|\d{1,9}[.)])[ \t]/

// Splits a top-level list block into its items, nested lines staying with
// their item. Anything that is not a list of two or more items stays whole.
function listItems(block: string): string[] | null {
  const lines = block.replace(/\s+$/, "").split("\n")
  const first = LIST_ITEM.exec(lines[0] ?? "")
  if (!first) return null
  const indent = first[1]?.length ?? 0
  const items: string[][] = []
  for (const line of lines) {
    const match = LIST_ITEM.exec(line)
    const dedented = line.replace(new RegExp(`^ {0,${indent}}`), "")
    if (match && (match[1]?.length ?? 0) === indent) items.push([dedented])
    else items.at(-1)?.push(dedented)
  }
  if (items.length < 2) return null
  return items.map((item) => item.join("\n").trim())
}

// Collapses whitespace so a selection matches the rendered text however it
// was split across elements.
function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

// Finds the rendered words of `quote` inside `root`, preferring the occurrence
// nearest `at` (an offset into the root's normalized text).
function findRange(root: HTMLElement, quote: string, at = 0): Range | null {
  const target = normalize(quote)
  if (!target) return null
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
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
      if (flat === "" || flat.endsWith(" ")) continue
      flat += " "
    } else flat += char
    raw.push(index)
  }
  let best = -1
  for (let found = flat.indexOf(target); found !== -1; found = flat.indexOf(target, found + 1)) {
    if (best === -1 || Math.abs(found - at) < Math.abs(best - at)) best = found
  }
  if (best === -1) return null
  const first = raw[best]
  const last = raw[best + target.length - 1]
  if (first === undefined || last === undefined) return null
  const range = document.createRange()
  const place = (index: number, edge: "start" | "end") => {
    let node = 0
    while (node + 1 < starts.length && (starts[node + 1] ?? 0) <= index) node++
    const text = nodes[node]
    if (!text) return
    const offset = index - (starts[node] ?? 0)
    if (edge === "start") range.setStart(text, offset)
    else range.setEnd(text, offset + 1)
  }
  place(first, "start")
  place(last, "end")
  return range
}

// Ranges of commented words across every response, painted by one CSS
// highlight so the rendered markdown is never touched.
const commentRanges = new Map<string, Range>()

function paintHighlights() {
  if (!("highlights" in CSS)) return
  CSS.highlights.set("reply-comment", new Highlight(...commentRanges.values()))
}

type Draft = { id?: string; quote: string; at?: number }
type Pending = { quote: string; at: number; top: number; left: number }
type Card = { comment: ReplyComment; top: number; left: number }

// One commentable part of a response. Hovering fades in a highlighter in the
// gutter that comments on the whole part; selecting words in it offers a
// comment on just those. Commented text stays highlighted and hovering it
// shows the comment.
function Commentable({
  messageId,
  quote,
  disabled,
  children,
}: {
  messageId: string
  quote: string
  disabled?: boolean
  children: ReactNode
}) {
  const state = useContext(ReplyCommentsContext)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [cardOpen, setCardOpen] = useState(false)
  const [pending, setPending] = useState<Pending | null>(null)
  const [card, setCard] = useState<Card | null>(null)
  const wrapper = useRef<HTMLDivElement | null>(null)
  const body = useRef<HTMLDivElement | null>(null)
  const ranges = useRef(new Map<string, Range>())
  const closeCard = useRef(0)
  const block = quote.trim()
  const mine = state?.replies.filter((reply) => reply.messageId === messageId && reply.block === block) ?? []
  const comment = mine.find((reply) => reply.quote === block)
  const excerpts = mine.filter((reply) => reply.quote !== block)
  const enabled = Boolean(state && messageId && block) && !disabled
  const wholeHighlighted = Boolean(comment) || draft?.quote === block

  // Places the highlights of this part's commented words, again whenever the
  // rendered markdown changes underneath them.
  // A whole-part comment highlights all of its text; an empty quote marks that.
  const marks = excerpts.map((reply) => ({ key: reply.id, quote: reply.quote, at: reply.at }))
  if (draft && draft.quote !== block && !draft.id) marks.push({ key: "draft", quote: draft.quote, at: draft.at })
  if (wholeHighlighted) marks.push({ key: "whole", quote: "", at: undefined })
  const marksKey = JSON.stringify(marks)
  useLayoutEffect(() => {
    const root = body.current
    if (!root) return
    const owned = new Map<string, string>()
    const place = () => {
      ranges.current.clear()
      for (const mark of JSON.parse(marksKey) as typeof marks) {
        const key = owned.get(mark.key) ?? `${crypto.randomUUID()}`
        owned.set(mark.key, key)
        let range = findRange(root, mark.quote, mark.at)
        if (!mark.quote) {
          range = document.createRange()
          range.selectNodeContents(root)
        }
        if (range) {
          ranges.current.set(mark.key, range)
          commentRanges.set(key, range)
        } else commentRanges.delete(key)
      }
      paintHighlights()
    }
    place()
    if (owned.size === 0) return
    const observer = new MutationObserver(place)
    observer.observe(root, { childList: true, subtree: true, characterData: true })
    return () => {
      observer.disconnect()
      for (const key of owned.values()) commentRanges.delete(key)
      ranges.current.clear()
      paintHighlights()
    }
  }, [marksKey])

  // Drops the comment button once the selection goes away.
  useEffect(() => {
    if (!pending) return
    const onChange = () => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) setPending(null)
    }
    document.addEventListener("selectionchange", onChange)
    return () => document.removeEventListener("selectionchange", onChange)
  }, [pending])

  function offsetOf(rect: DOMRect) {
    const box = wrapper.current?.getBoundingClientRect()
    if (!box) return { top: 0, left: 0 }
    return { top: rect.top - box.top, left: rect.left - box.left + rect.width / 2 }
  }

  function onMouseUp() {
    if (!enabled) return
    // The selection settles after mouseup.
    window.setTimeout(() => {
      const root = body.current
      const selection = window.getSelection()
      if (!root || !selection || selection.isCollapsed || selection.rangeCount === 0) return
      if (!root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) return
      const range = selection.getRangeAt(0)
      const text = normalize(range.toString())
      if (!text) return
      const before = document.createRange()
      before.setStart(root, 0)
      before.setEnd(range.startContainer, range.startOffset)
      let at = normalize(before.toString()).length
      if (at > 0) at += 1
      setPending({ quote: text, at, ...offsetOf(range.getBoundingClientRect()) })
    }, 0)
  }

  function onMouseMove(event: React.MouseEvent) {
    if (excerpts.length === 0) return
    for (const reply of excerpts) {
      const range = ranges.current.get(reply.id)
      if (!range) continue
      for (const rect of range.getClientRects()) {
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) continue
        window.clearTimeout(closeCard.current)
        if (card?.comment.id !== reply.id) setCard({ comment: reply, ...offsetOf(range.getBoundingClientRect()) })
        return
      }
    }
    scheduleClose()
  }

  function scheduleClose() {
    window.clearTimeout(closeCard.current)
    closeCard.current = window.setTimeout(() => setCard(null), 150)
  }

  function save(value: string) {
    if (!state || !draft) return
    const editing = draft.id
    if (editing) state.onReplies((current) => current.map((reply) => (reply.id === editing ? { ...reply, text: value } : reply)))
    else {
      const reply: ReplyComment = { id: crypto.randomUUID(), messageId, block, quote: draft.quote, text: value }
      if (draft.at !== undefined) reply.at = draft.at
      state.onReplies((current) => [...current, reply])
    }
    setDraft(null)
  }

  function remove(id: string) {
    if (!state) return
    setCardOpen(false)
    setCard(null)
    state.onReplies((current) => current.filter((reply) => reply.id !== id))
  }

  const actions = (target: ReplyComment) => (
    <div className="flex justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={() => {
          setCardOpen(false)
          setCard(null)
          setDraft({ id: target.id, quote: target.quote, at: target.at })
        }}
      >
        <PencilIcon className="size-3" />
        Edit
      </Button>
      <Button type="button" variant="ghost" size="xs" onClick={() => remove(target.id)}>
        <Trash2Icon className="size-3" />
        Delete
      </Button>
    </div>
  )

  let draftComment: ReplyComment | undefined
  if (draft?.id) draftComment = mine.find((reply) => reply.id === draft.id)

  return (
    <div ref={wrapper} className="group/reply relative" onMouseUp={onMouseUp} onMouseMove={onMouseMove} onMouseLeave={scheduleClose}>
      {enabled && !comment && !draft ? (
        <button
          type="button"
          aria-label="Comment on this part"
          title="Comment"
          className="absolute top-0.5 -left-6 flex size-5 items-center justify-center rounded text-white/40 opacity-0 transition-opacity duration-200 group-hover/reply:opacity-100 hover:bg-white/10 hover:text-white focus-visible:opacity-100"
          onClick={() => setDraft({ quote: block })}
        >
          <HighlighterIcon className="size-3.5" />
        </button>
      ) : null}
      {pending && !draft ? (
        <button
          type="button"
          className="reply-pop absolute z-20 flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-md border border-white/10 bg-secondary px-2 py-1 text-xs text-white shadow-md hover:bg-white/10"
          style={{ top: pending.top - 6, left: pending.left }}
          // Keeps the selection while the button is pressed.
          onMouseDown={(event) => event.preventDefault()}
          onMouseUp={(event) => event.stopPropagation()}
          onClick={() => {
            setDraft({ quote: pending.quote, at: pending.at })
            setPending(null)
            window.getSelection()?.removeAllRanges()
          }}
        >
          <MessageSquarePlusIcon className="size-3.5" />
          Comment
        </button>
      ) : null}
      {card && !draft ? (
        <div
          className="reply-pop absolute z-20 w-72 -translate-x-1/2 -translate-y-full space-y-2 rounded-md border bg-popover p-3 text-xs text-popover-foreground shadow-md"
          style={{ top: card.top - 6, left: Math.max(card.left, 144) }}
          onMouseEnter={() => window.clearTimeout(closeCard.current)}
          onMouseMove={(event) => event.stopPropagation()}
          onMouseLeave={scheduleClose}
          onMouseUp={(event) => event.stopPropagation()}
        >
          <p className="whitespace-pre-wrap">{card.comment.text}</p>
          {actions(card.comment)}
        </div>
      ) : null}
      <HoverCard open={Boolean(comment) && !draft && !card && cardOpen} onOpenChange={setCardOpen} openDelay={150} closeDelay={150}>
        <HoverCardTrigger asChild>
          <div
            ref={body}
            className={cn(wholeHighlighted && "reply-highlight")}
          >
            {children}
          </div>
        </HoverCardTrigger>
        {comment ? (
          <HoverCardContent side="top" align="start" className="w-72 space-y-2 p-3 text-xs">
            <p className="whitespace-pre-wrap">{comment.text}</p>
            {actions(comment)}
          </HoverCardContent>
        ) : null}
      </HoverCard>
      {draft ? (
        <CommentDraft
          className="mx-0 mt-2 mb-0"
          initial={draftComment?.text}
          saveLabel={draft.id ? "Save" : "Add comment"}
          onSave={save}
          onCancel={() => setDraft(null)}
        />
      ) : null}
    </div>
  )
}

// A top-level block of a response, rendered by `children`. Once the response
// is complete a list is split so each item takes its own comment.
function ResponseBlock({
  messageId,
  block,
  streaming,
  children,
}: {
  messageId: string
  block: string
  streaming: boolean
  children: ReactNode
}) {
  let items: string[] | null = null
  if (!streaming) items = listItems(block)
  if (!items) {
    return (
      <Commentable messageId={messageId} quote={block} disabled={streaming}>
        {children}
      </Commentable>
    )
  }
  return (
    <div>
      {items.map((item, index) => (
        <Commentable key={index} messageId={messageId} quote={item}>
          <MessageResponse className="h-auto">{item}</MessageResponse>
        </Commentable>
      ))}
    </div>
  )
}

function CommentableResponse({ messageId, text }: { messageId: string; text: string }) {
  const blocks = parseMarkdownIntoBlocks(text)
  return (
    <div className="space-y-4">
      {blocks.map((block, index) => (
        <ResponseBlock key={index} messageId={messageId} block={block} streaming={false}>
          <MessageResponse className="h-auto">{block}</MessageResponse>
        </ResponseBlock>
      ))}
    </div>
  )
}

export { CommentableResponse, ReplyCommentsContext, ResponseBlock }
