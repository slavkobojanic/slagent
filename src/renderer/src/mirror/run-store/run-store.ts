import { compareStructural, makeAutoObservable } from "mobx"
import type { ChatMessage, QueuedMessage, QuestionRequest, TaskInfo, TodoItem, TranscriptState, UsageState } from "@shared/types"

export type RunTranscript = TranscriptState & { chatId: string | null }

export class RunStore {
  messages: ChatMessage[] = []
  // Where the shown messages sit in the whole chat; the main process sends only a window.
  transcriptPage: { windowStart: number; hasOlder: boolean; hasNewer: boolean } = { windowStart: 0, hasOlder: false, hasNewer: false }
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
    makeAutoObservable(this)
  }

  setTranscript(transcript: RunTranscript) {
    this.messages = reuseUnchanged(this.messages, transcript.messages)
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

// Every transcript event carries the whole window, so keeping the messages that did not change
// lets the turns that show them skip re-rendering while one message streams.
function reuseUnchanged(previous: ChatMessage[], next: ChatMessage[]): ChatMessage[] {
  const byId = new Map(previous.map((message) => [message.id, message]))
  return next.map((message) => {
    const kept = byId.get(message.id)
    if (kept && compareStructural(kept, message)) {
      return kept
    }
    return message
  })
}
