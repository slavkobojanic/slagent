import { makeAutoObservable } from "mobx"
import type { ReviewStore } from "@/state/review/review-store/review-store"

export type PendingReply = { id: string; quote: string; text: string }
export type PendingDiff = { id: string; location: string; text: string }

export class PendingCommentsStore {
  constructor(private readonly reviewStore: ReviewStore) {
    makeAutoObservable(this)
  }

  // "1 reply comment and 2 diff comments": replies come first, as the summary always showed them.
  get label(): string {
    const replies = this.reviewStore.replyComments.length
    const diffs = this.reviewStore.diffComments.length
    const parts: string[] = []
    if (replies === 1) {
      parts.push("1 reply comment")
    }
    if (replies > 1) {
      parts.push(`${replies} reply comments`)
    }
    if (diffs === 1) {
      parts.push("1 diff comment")
    }
    if (diffs > 1) {
      parts.push(`${diffs} diff comments`)
    }
    return parts.join(" and ")
  }

  get replies(): PendingReply[] {
    return this.reviewStore.replyComments.map((comment) => ({
      id: comment.id,
      quote: comment.quote.replace(/\s+/g, " "),
      text: comment.text,
    }))
  }

  get diffs(): PendingDiff[] {
    return this.reviewStore.diffComments.map((comment) => ({
      id: comment.id,
      location: `${comment.path.split("/").pop() ?? comment.path}:${comment.line}`,
      text: comment.text,
    }))
  }
}
