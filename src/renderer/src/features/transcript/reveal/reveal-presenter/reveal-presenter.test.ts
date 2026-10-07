import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { AssistantMessage, ChatMessage } from "@shared/types"
import { RevealPresenter } from "@/features/transcript/reveal/reveal-presenter/reveal-presenter"
import { RevealStore } from "@/features/transcript/reveal/reveal-store/reveal-store"
import { REVEAL_STEP_MS } from "@/features/transcript/reveal/reveal-timing"
import { RunStore } from "@/mirror/run-store"

// Splits on blank lines, which is enough to stand in for the markdown block parser here.
function parse(text: string): string[] {
  return text.split("\n\n")
}

function assistant(id: string, overrides: Partial<AssistantMessage> = {}): AssistantMessage {
  return { id, role: "assistant", text: "", thinking: "", streaming: true, error: null, ...overrides }
}

// Puts a transcript event into the run store, as the mirror does.
function show(run: RunStore, messages: ChatMessage[], chatId: string | null = "c1") {
  run.setTranscript({
    messages,
    windowStart: 0,
    hasOlder: false,
    hasNewer: false,
    streaming: false,
    notice: null,
    queue: [],
    usage: null,
    todos: [],
    planMode: false,
    tasks: [],
    planProposal: null,
    question: null,
    chatId,
  })
}

function setup() {
  const run = new RunStore()
  const store = new RevealStore()
  const presenter = new RevealPresenter(store, run, parse, { window })
  presenter.start()
  return { run, store, presenter }
}

describe("RevealPresenter", () => {
  beforeEach(() => {
    // Fake timers also fake performance.now, so the clock and the timers move together.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] })
    vi.stubGlobal("matchMedia", () => ({ matches: false }))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("can show the first block of a reply as soon as it starts streaming", () => {
    const { run, store } = setup()

    show(run, [assistant("a1", { text: "One\n\nTwo\n\nThree" })])

    expect(store.shownOf("a1")).toBe(1)
  })

  it("can reveal the next block one step after the one before it", () => {
    const { run, store } = setup()
    show(run, [assistant("a1", { text: "One\n\nTwo\n\nThree" })])
    vi.advanceTimersByTime(0)

    vi.advanceTimersByTime(REVEAL_STEP_MS - 1)
    expect(store.shownOf("a1")).toBe(1)

    vi.advanceTimersByTime(1)
    expect(store.shownOf("a1")).toBe(2)
  })

  it("can show every block of a reply in turn", () => {
    const { run, store } = setup()
    show(run, [assistant("a1", { text: "One\n\nTwo\n\nThree" })])

    vi.advanceTimersByTime(3 * REVEAL_STEP_MS)

    expect(store.shownOf("a1")).toBe(3)
  })

  it("can reveal a block that arrives while the reply is still streaming", () => {
    const { run, store } = setup()
    show(run, [assistant("a1", { text: "One" })])
    vi.advanceTimersByTime(0)

    show(run, [assistant("a1", { text: "One\n\nTwo" })])
    vi.advanceTimersByTime(REVEAL_STEP_MS)

    expect(store.shownOf("a1")).toBe(2)
  })

  it("can leave a reply that finished before the transcript saw it to render whole", () => {
    const { run, store } = setup()

    show(run, [assistant("a1", { text: "One\n\nTwo", streaming: false })])

    expect(store.shownOf("a1")).toBeUndefined()
  })

  it("can leave a reply with no text alone", () => {
    const { run, store } = setup()

    show(run, [assistant("a1", { text: "", streaming: true })])

    expect(store.shownOf("a1")).toBeUndefined()
  })

  it("can start no reveal under reduced motion", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }))
    const { run, store } = setup()

    show(run, [assistant("a1", { text: "One\n\nTwo" })])

    expect(store.shownOf("a1")).toBeUndefined()
  })

  it("can forget the replies of the previous chat when another chat opens", () => {
    const { run, store } = setup()
    show(run, [assistant("a1", { text: "One\n\nTwo" })], "c1")
    vi.advanceTimersByTime(REVEAL_STEP_MS)

    show(run, [assistant("a2", { text: "Other", streaming: false })], "c2")

    expect(store.shownOf("a1")).toBeUndefined()
  })

  it("can stop revealing once stopped", () => {
    const { run, store, presenter } = setup()
    show(run, [assistant("a1", { text: "One\n\nTwo\n\nThree" })])
    presenter.stop()

    vi.advanceTimersByTime(10 * REVEAL_STEP_MS)

    expect(store.shownOf("a1")).toBe(1)
  })
})
