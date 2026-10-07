import { isValidElement, type ReactNode } from "react"
import type { ReplyComment } from "@shared/types"
import { listItems } from "@/features/transcript/commentable-response/comment-text"
import type { DraftState, OpenCard, PendingSelection } from "@/features/transcript/commentable-response/commentable-response-store/commentable-response-store"

// A commentable part of a response: a top-level block, or one item of a list. Its key comes from
// the message and the part's markdown, so it is the same on every render of that part.
export type CommentUnit = {
  key: string
  messageId: string
  // The markdown of the part. A comment saved on it records this as its block.
  block: string
  // False while the response streams, so the part cannot take a new comment yet.
  enabled: boolean
}

// A range to highlight inside a unit: a comment's quote, the open draft, or the whole unit
// (an empty quote).
export type CommentMark = { key: string; quote: string; at?: number }

export function unitKeyOf(messageId: string, block: string): string {
  return `${messageId}\n${block}`
}

// The transcript renders each block as one child: a MessageResponse whose only child is the block's
// markdown. Anything else is not a block the review can identify, so it returns null.
export function blockMarkdown(node: ReactNode): string | null {
  if (!isValidElement<{ children?: ReactNode }>(node)) {
    return null
  }
  const text = node.props.children
  return typeof text === "string" ? text : null
}

// The items of a finished list block, or null when the block is not a list of two or more items
// or the response is still streaming. A streaming list stays whole until it finishes.
export function blockItems(markdown: string, streaming: boolean): string[] | null {
  if (streaming) {
    return null
  }
  return listItems(markdown)
}

// The units a response block is commented as: the whole block, or each item of a finished list.
// A child that is not a block the review can identify has none.
export function responseUnits(messageId: string, children: ReactNode, streaming: boolean): { whole: CommentUnit | null; items: CommentUnit[] } {
  const markdown = blockMarkdown(children)
  if (markdown === null) {
    return { whole: null, items: [] }
  }
  const items = blockItems(markdown, streaming)
  if (items === null) {
    const block = markdown.trim()
    return { whole: { key: unitKeyOf(messageId, block), messageId, block, enabled: !streaming }, items: [] }
  }
  return { whole: null, items: items.map((item) => ({ key: unitKeyOf(messageId, item), messageId, block: item, enabled: true })) }
}

export type CommentUnitInput = {
  unit: CommentUnit
  replies: ReplyComment[]
  draft: DraftState | null
  pending: PendingSelection | null
  card: OpenCard | null
  cardOpen: boolean
}

export type CommentUnitView = {
  comment: ReplyComment | null
  gutter: boolean
  wholeHighlighted: boolean
  hoverOpen: boolean
  draft: { initial: string; saveLabel: string } | null
  pending: { top: number; left: number } | null
  card: { comment: ReplyComment; top: number; left: number } | null
  marks: CommentMark[]
}

export function commentUnitView({ unit, replies, draft, pending, card, cardOpen }: CommentUnitInput): CommentUnitView {
  const { block } = unit
  const comment = replies.find((reply) => reply.quote === block) ?? null
  const excerpts = replies.filter((reply) => reply.quote !== block)
  const enabled = unit.enabled && block !== ""
  const wholeHighlighted = comment !== null || draft?.quote === block

  const marks: CommentMark[] = excerpts.map((reply) => ({ key: reply.id, quote: reply.quote, at: reply.at }))
  if (draft !== null && draft.quote !== block && !draft.id) {
    marks.push({ key: "draft", quote: draft.quote, at: draft.at })
  }
  if (wholeHighlighted) {
    marks.push({ key: "whole", quote: "" })
  }

  let openDraft: CommentUnitView["draft"] = null
  if (draft !== null) {
    const editing = draft.id ? replies.find((reply) => reply.id === draft.id) : undefined
    openDraft = { initial: editing?.text ?? "", saveLabel: draft.id ? "Save" : "Add comment" }
  }

  let openCard: CommentUnitView["card"] = null
  if (card !== null && draft === null) {
    const hovered = replies.find((reply) => reply.id === card.commentId)
    if (hovered !== undefined) {
      openCard = { comment: hovered, top: card.top, left: card.left }
    }
  }

  return {
    comment,
    gutter: enabled && comment === null && draft === null,
    wholeHighlighted,
    hoverOpen: comment !== null && draft === null && card === null && cardOpen,
    draft: openDraft,
    pending: pending !== null && draft === null ? { top: pending.top, left: pending.left } : null,
    card: openCard,
    marks,
  }
}
