import type { DiffComment, ReplyComment } from "@shared/types"
import type { ReviewStore } from "@/state/review/review-store/review-store"

export type ReviewSnapshot = { diffComments: DiffComment[]; replyComments: ReplyComment[] }

// The restored comments go ahead of the drafts. A comment whose id is already a draft keeps the
// draft's copy, and an id that the restored list repeats is added once.
function mergeRestored<T extends { id: string }>(restored: T[], drafts: T[]): T[] {
  const ids = new Set(drafts.map((item) => item.id))
  const added: T[] = []
  for (const item of restored) {
    if (ids.has(item.id)) {
      continue
    }
    ids.add(item.id)
    added.push(item)
  }
  return [...added, ...drafts]
}

export class ReviewPresenter {
  constructor(public readonly store: ReviewStore) {}

  addDiffComment = (comment: DiffComment) => {
    this.store.setDiffComments([...this.store.diffComments, comment])
  }

  removeDiffComment = (id: string) => {
    this.store.setDiffComments(this.store.diffComments.filter((item) => item.id !== id))
  }

  addReplyComment = (comment: ReplyComment) => {
    this.store.setReplyComments([...this.store.replyComments, comment])
  }

  editReplyComment = (id: string, text: string) => {
    this.store.setReplyComments(this.store.replyComments.map((reply) => (reply.id === id ? { ...reply, text } : reply)))
  }

  removeReplyComment = (id: string) => {
    this.store.setReplyComments(this.store.replyComments.filter((item) => item.id !== id))
  }

  reset = () => {
    this.store.setDiffComments([])
    this.store.setReplyComments([])
  }

  takeForSubmit = (): ReviewSnapshot => {
    const snapshot = { diffComments: this.store.diffComments, replyComments: this.store.replyComments }
    this.reset()
    return snapshot
  }

  // Drafts written while the send was in flight are kept.
  restore = (snapshot: ReviewSnapshot) => {
    this.store.setDiffComments(mergeRestored(snapshot.diffComments, this.store.diffComments))
    this.store.setReplyComments(mergeRestored(snapshot.replyComments, this.store.replyComments))
  }
}
