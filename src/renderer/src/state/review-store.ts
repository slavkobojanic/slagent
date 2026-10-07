import { makeAutoObservable, observableRef } from "mobx"
import type { DiffComment, ReplyComment } from "@shared/types"

// Comments the user has written but not sent yet: on a diff line, and on a reply in the transcript.
export class ReviewStore {
  diffComments: DiffComment[] = []
  replyComments: ReplyComment[] = []

  constructor() {
    makeAutoObservable(this, { diffComments: observableRef, replyComments: observableRef })
  }

  // The pending comments on one block of one response, in the order they were added.
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
