import { makeAutoObservable } from "mobx"
import type { DiffComment, ReplyComment } from "@shared/types"

export class ReviewStore {
  diffComments: DiffComment[] = []
  replyComments: ReplyComment[] = []

  constructor() {
    makeAutoObservable(this)
  }

  repliesFor(messageId: string, block: string): ReplyComment[] {
    return this.replyComments.filter((reply) => reply.messageId === messageId && reply.block === block)
  }

  setDiffComments(value: DiffComment[]) {
    this.diffComments = value
  }

  setReplyComments(value: ReplyComment[]) {
    this.replyComments = value
  }
}
