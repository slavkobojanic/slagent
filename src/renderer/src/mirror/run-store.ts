import { makeAutoObservable, observableRef } from "mobx"
import type { ChatMessage, QueuedMessage, QuestionRequest, TaskInfo, TodoItem, TranscriptState, UsageState } from "@shared/types"

// A transcript state tagged with the chat it belongs to. Transcript events and the
// snapshot both reduce to this shape.
export type RunTranscript = TranscriptState & { chatId: string | null }

// The open chat's run: its visible messages and everything a run reports while it
// works. Only the mirror presenter writes it.
export class RunStore {
  messages: ChatMessage[] = []
  // Where the shown messages sit in the whole chat; the main process sends only a window.
  transcriptPage: { windowStart: number; hasOlder: boolean; hasNewer: boolean } = { windowStart: 0, hasOlder: false, hasNewer: false }
  // The chat the shown messages belong to. The transcript keys on it, so opening a chat mounts it fresh.
  transcriptChatId: string | null = null
  streaming = false
  notice: string | null = null
  queue: QueuedMessage[] = []
  usage: UsageState | null = null
  todos: TodoItem[] = []
  planMode = false
  tasks: TaskInfo[] = []
  planProposal: string | null = null
  question: QuestionRequest | null = null

  constructor() {
    makeAutoObservable(this, {
      messages: observableRef,
      transcriptPage: observableRef,
      queue: observableRef,
      usage: observableRef,
      todos: observableRef,
      tasks: observableRef,
      question: observableRef,
    })
  }

  setTranscript(transcript: RunTranscript) {
    this.messages = transcript.messages
    this.transcriptPage = { windowStart: transcript.windowStart, hasOlder: transcript.hasOlder, hasNewer: transcript.hasNewer }
    this.transcriptChatId = transcript.chatId
    this.streaming = transcript.streaming
    this.notice = transcript.notice
    this.queue = transcript.queue
    this.usage = transcript.usage
    this.todos = transcript.todos
    this.planMode = transcript.planMode
    this.tasks = transcript.tasks
    this.planProposal = transcript.planProposal
    this.question = transcript.question
  }
}
