import { describe, expect, it } from "vitest"
import type { ChatMessage, QueuedMessage, TaskInfo, TodoItem, UsageState } from "@shared/types"
import { RunStore, type RunTranscript } from "@/mirror/run-store"

const message: ChatMessage = { id: "m1", role: "user", text: "hello", attachments: [] }
const queued: QueuedMessage = { id: "q1", text: "next", mode: "follow-up", detail: "" }
const todo: TodoItem = { text: "write tests", status: "in_progress" }
const task: TaskInfo = { id: "t1", label: "build", command: "pnpm build", status: "running", exitCode: null, startedAt: 1, endedAt: null }
const usage: UsageState = { contextTokens: 10, contextWindow: 100, percent: 10, inputTokens: 5, outputTokens: 5, cacheTokens: 0, totalTokens: 10, cost: 0.01 }

const transcript: RunTranscript = {
  chatId: "c3",
  messages: [message],
  windowStart: 4,
  hasOlder: true,
  hasNewer: false,
  streaming: true,
  notice: "Compacted",
  queue: [queued],
  usage,
  todos: [todo],
  planMode: true,
  tasks: [task],
  planProposal: "Plan text",
  question: null,
}

describe("RunStore", () => {
  describe("setTranscript", () => {
    it("can write every transcript field in one call", () => {
      const store = new RunStore()

      store.setTranscript(transcript)

      expect(store.messages).toEqual([message])
      expect(store.transcriptPage).toEqual({ windowStart: 4, hasOlder: true, hasNewer: false })
      expect(store.transcriptChatId).toBe("c3")
      expect(store.streaming).toBe(true)
      expect(store.notice).toBe("Compacted")
      expect(store.queue).toEqual([queued])
      expect(store.usage).toEqual(usage)
      expect(store.todos).toEqual([todo])
      expect(store.planMode).toBe(true)
      expect(store.tasks).toEqual([task])
      expect(store.planProposal).toBe("Plan text")
      expect(store.question).toBeNull()
    })

    it("can replace the previous values when called again", () => {
      const store = new RunStore()
      store.setTranscript(transcript)

      store.setTranscript({ ...transcript, chatId: null, messages: [], streaming: false, usage: null })

      expect(store.messages).toEqual([])
      expect(store.transcriptChatId).toBeNull()
      expect(store.streaming).toBe(false)
      expect(store.usage).toBeNull()
    })
  })
})
