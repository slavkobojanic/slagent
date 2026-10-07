import { reaction } from "mobx"
import type { ChatMessage } from "@shared/types"
import type { RunStore } from "@/mirror/run-store"
import type { AppEnv } from "@/state/app-deps"
import type { RevealStore } from "@/features/transcript/reveal/reveal-store/reveal-store"
import { blockStart } from "@/features/transcript/reveal/reveal-timing"

// The timeline of one streamed response: when it started, when each block appeared, and how
// many blocks the text has now.
type Clock = { origin: number; starts: number[]; revealed: number; count: number }

// Reveals a streamed response one block at a time. A reply that streams while the transcript
// is open gets a clock. Each time its text grows, the clock is given the new block count and
// schedules the blocks that now need to appear. Reduced motion never starts a clock.
export class RevealPresenter {
  private disposers: Array<() => void> = []
  private chatId: string | null = null
  private clocks = new Map<string, Clock>()
  private texts = new Map<string, string>()
  private timers = new Map<string, number>()

  constructor(
    private readonly store: RevealStore,
    private readonly run: Pick<RunStore, "messages" | "transcriptChatId">,
    private readonly parse: (text: string) => string[],
    private readonly env: AppEnv,
  ) {}

  start = () => {
    if (this.disposers.length > 0) {
      return
    }
    this.disposers.push(reaction(() => this.run.messages, this.sync))
  }

  stop = () => {
    for (const dispose of this.disposers) {
      dispose()
    }
    this.disposers = []
    this.clearTimers()
    this.clocks.clear()
    this.texts.clear()
  }

  private sync = (messages: ChatMessage[]) => {
    const chatId = this.run.transcriptChatId
    if (chatId !== this.chatId) {
      this.chatId = chatId
      this.reset()
    }
    for (const message of messages) {
      if (message.role !== "assistant" || message.text === "") {
        continue
      }
      if (!this.clocks.has(message.id)) {
        if (!message.streaming || this.reduceMotion()) {
          continue
        }
        this.begin(message.id)
      }
      if (this.texts.get(message.id) === message.text) {
        continue
      }
      this.texts.set(message.id, message.text)
      this.target(message.id, this.parse(message.text).length)
    }
  }

  private begin = (messageId: string) => {
    const origin = this.env.window.performance.now()
    this.clocks.set(messageId, { origin, starts: [origin], revealed: 1, count: 1 })
    this.store.setShown(messageId, 1)
  }

  private target = (messageId: string, count: number) => {
    const clock = this.clocks.get(messageId)
    if (clock === undefined) {
      return
    }
    clock.count = count
    this.schedule(messageId, 0)
  }

  private revealDue = (messageId: string) => {
    this.timers.delete(messageId)
    const clock = this.clocks.get(messageId)
    if (clock === undefined || clock.revealed >= clock.count) {
      return
    }
    const index = clock.revealed
    const previousStart = clock.starts[index - 1] ?? clock.origin
    const start = blockStart(clock.origin, index, previousStart)
    const now = this.env.window.performance.now()
    if (start > now) {
      this.schedule(messageId, start - now)
      return
    }
    clock.starts[index] = now
    clock.revealed = index + 1
    this.store.setShown(messageId, clock.revealed)
    if (clock.revealed < clock.count) {
      this.schedule(messageId, 0)
    }
  }

  private schedule = (messageId: string, delay: number) => {
    this.cancel(messageId)
    const timer = this.env.window.setTimeout(() => this.revealDue(messageId), delay)
    this.timers.set(messageId, timer)
  }

  private cancel = (messageId: string) => {
    const timer = this.timers.get(messageId)
    if (timer === undefined) {
      return
    }
    this.env.window.clearTimeout(timer)
    this.timers.delete(messageId)
  }

  private clearTimers = () => {
    for (const timer of this.timers.values()) {
      this.env.window.clearTimeout(timer)
    }
    this.timers.clear()
  }

  // A different chat starts with no clocks, so its replies render whole unless they stream.
  private reset = () => {
    this.clearTimers()
    this.clocks.clear()
    this.texts.clear()
    this.store.clear()
  }

  private reduceMotion = (): boolean => {
    return this.env.window.matchMedia("(prefers-reduced-motion: reduce)").matches
  }
}
