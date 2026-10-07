import { afterEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import type { AssistantMessage, ChatMessage, UserMessage } from "@shared/types"
import type { API } from "@/ipc/api"
import { TranscriptPresenter } from "@/features/transcript/transcript-presenter/transcript-presenter"
import { TranscriptStore } from "@/features/transcript/transcript-store/transcript-store"
import { RunStore } from "@/mirror/run-store/run-store"
import { JumpPort } from "@/state/jump-port/jump-port"
import { createMockInstance } from "@/test/create-mock-instance"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function user(id: string, overrides: Partial<UserMessage> = {}): UserMessage {
  return { id, role: "user", text: `prompt ${id}`, attachments: [], entryId: `entry-${id}`, ...overrides }
}

function assistant(id: string, overrides: Partial<AssistantMessage> = {}): AssistantMessage {
  return { id, role: "assistant", text: "Done", thinking: "", streaming: false, error: null, ...overrides }
}

type TranscriptWindow = {
  messages?: ChatMessage[]
  hasOlder?: boolean
  hasNewer?: boolean
  streaming?: boolean
  chatId?: string
}

// Puts a transcript event into the run store, as the mirror does.
function load(run: RunStore, window: TranscriptWindow = {}) {
  run.setTranscript({
    messages: window.messages ?? [],
    windowStart: 0,
    hasOlder: window.hasOlder ?? false,
    hasNewer: window.hasNewer ?? false,
    streaming: window.streaming ?? false,
    notice: null,
    queue: [],
    usage: null,
    todos: [],
    planMode: false,
    tasks: [],
    planProposal: null,
    question: null,
    chatId: window.chatId ?? "c1",
  })
}

function flushMicrotasks() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0))
}

function setup() {
  // Frames requested with requestAnimationFrame wait here until a test runs them.
  const frames: FrameRequestCallback[] = []
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    frames.push(callback)
    return frames.length
  })
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined)

  // Runs the queued frames and lets promise callbacks settle, until nothing is queued.
  async function settle() {
    for (let round = 0; round < 10; round++) {
      await flushMicrotasks()
      const queued = frames.splice(0, frames.length)
      for (const frame of queued) {
        frame(0)
      }
    }
    await flushMicrotasks()
  }

  const run = new RunStore()
  const store = new TranscriptStore()
  const api = createMockInstance<API>(["pageTranscript"])
  const jump = new JumpPort()
  const detachJump = vi.fn()
  vi.spyOn(jump, "attach").mockReturnValue(detachJump)
  api.pageTranscript.mockResolvedValue(undefined)
  const presenter = new TranscriptPresenter(store, run, api, jump, window)
  return { run, store, api, jump, detachJump, presenter, settle }
}

// The scroll controls of the conversation, with the parts the presenter reads.
function stick(scroller: HTMLElement | null, isAtBottom = true) {
  return { isAtBottom, scrollRef: { current: scroller }, scrollToBottom: vi.fn(), stopScroll: vi.fn() }
}

// jsdom has no layout. This gives a scroller the sizes the paging logic reads.
function scrollerOf(options: { scrollHeight: number; clientHeight: number; scrollTop: number }): HTMLElement {
  const scroller = document.createElement("div")
  Object.defineProperties(scroller, {
    scrollHeight: { value: options.scrollHeight, configurable: true },
    clientHeight: { value: options.clientHeight, configurable: true },
    scrollTop: { value: options.scrollTop, writable: true, configurable: true },
  })
  document.body.append(scroller)
  return scroller
}

// jsdom has no layout. This gives an element the box it occupies.
function boxAt(element: HTMLElement, top: number, bottom: number) {
  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: () => ({ x: 0, y: top, top, bottom, left: 0, right: 0, width: 0, height: bottom - top, toJSON: () => ({}) }),
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  document.body.replaceChildren()
  vi.mocked(toast.error).mockClear()
})

describe("TranscriptPresenter", () => {
  describe("start and stop", () => {
    it("can cancel a pending jump when the open chat changes", () => {
      const { run, store, presenter } = setup()
      load(run, { messages: [user("u1"), assistant("a7")] })
      presenter.start()
      store.setJumpTo("a7")

      load(run, { messages: [user("u1"), assistant("a7")], chatId: "c2" })

      expect(window.cancelAnimationFrame).toHaveBeenCalledTimes(1)
      presenter.stop()
    })
  })

  describe("attachScroll", () => {
    it("can record whether the reader is at the bottom", () => {
      const { store, presenter } = setup()

      presenter.attachScroll(stick(null, false))

      expect(store.atBottom).toBe(false)
    })

    it("can ask for the older page when the reader scrolls near the top", async () => {
      const { run, api, presenter, settle } = setup()
      load(run, { messages: [user("u1")], hasOlder: true })
      const scroller = scrollerOf({ scrollHeight: 3000, clientHeight: 500, scrollTop: 100 })
      presenter.attachScroll(stick(scroller))

      scroller.dispatchEvent(new Event("scroll"))
      await settle()

      expect(api.pageTranscript).toHaveBeenCalledWith("older")
      presenter.stop()
    })

    it("can ask for the newer page and stop the scroll when the reader nears the bottom", async () => {
      const { run, api, presenter, settle } = setup()
      load(run, { messages: [user("u1")], hasNewer: true })
      const scroller = scrollerOf({ scrollHeight: 3000, clientHeight: 500, scrollTop: 2400 })
      const context = stick(scroller)
      presenter.attachScroll(context)

      scroller.dispatchEvent(new Event("scroll"))
      await settle()

      expect(context.stopScroll).toHaveBeenCalled()
      expect(api.pageTranscript).toHaveBeenCalledWith("newer")
      presenter.stop()
    })

    it("can ask for no page while the reader is in the middle of the window", async () => {
      const { run, api, presenter, settle } = setup()
      load(run, { messages: [user("u1")], hasOlder: true, hasNewer: true })
      const scroller = scrollerOf({ scrollHeight: 3000, clientHeight: 500, scrollTop: 1200 })
      presenter.attachScroll(stick(scroller))

      scroller.dispatchEvent(new Event("scroll"))
      await settle()

      expect(api.pageTranscript).not.toHaveBeenCalled()
      presenter.stop()
    })
  })

  describe("handleScrollDown", () => {
    it("can scroll to the bottom when the window is at the live end", () => {
      const { run, presenter } = setup()
      load(run, { messages: [user("u1")] })
      const context = stick(null)
      presenter.attachScroll(context)

      presenter.handleScrollDown()

      expect(context.scrollToBottom).toHaveBeenCalled()
    })

    it("can load the latest turns when the window is not at the live end", async () => {
      const { run, api, presenter, settle } = setup()
      load(run, { messages: [user("u1")], hasNewer: true })
      presenter.attachScroll(stick(null))

      presenter.handleScrollDown()
      await settle()

      expect(api.pageTranscript).toHaveBeenCalledWith("latest")
    })
  })

  describe("jump port", () => {
    it("can attach its jump handler when started", () => {
      const { jump, presenter } = setup()

      presenter.start()

      expect(jump.attach).toHaveBeenCalledWith(expect.any(Function))
      presenter.stop()
    })

    it("can release the jump handler when stopped", () => {
      const { detachJump, presenter } = setup()
      presenter.start()

      presenter.stop()

      expect(detachJump).toHaveBeenCalledTimes(1)
    })

    it("can hold the message a search result asks for", () => {
      const { jump, store, presenter } = setup()
      presenter.start()
      const handler = vi.mocked(jump.attach).mock.calls[0]?.[0]

      handler?.("a7")

      expect(store.jumpTo).toBe("a7")
      presenter.stop()
    })

    it("can scroll to a requested message that is already on screen", async () => {
      const { run, store, jump, presenter, settle } = setup()
      load(run, { messages: [user("u1"), assistant("a7")] })
      const target = document.createElement("div")
      target.dataset.messageId = "a7"
      target.scrollIntoView = vi.fn()
      document.body.append(target)
      presenter.start()
      const handler = vi.mocked(jump.attach).mock.calls[0]?.[0]

      handler?.("a7")
      await settle()

      expect(target.scrollIntoView).toHaveBeenCalledWith({ block: "center" })
      expect(store.jumpTo).toBeNull()
      presenter.stop()
    })
  })

  describe("handleSettle", () => {
    it("can return to the bottom once the requested latest turns are in", async () => {
      const { run, presenter, settle } = setup()
      load(run, { messages: [user("u1")], hasNewer: true })
      const context = stick(null)
      presenter.attachScroll(context)
      presenter.handleScrollDown()
      await settle()

      load(run, { messages: [user("u1")], hasNewer: false })
      presenter.handleSettle()

      expect(context.scrollToBottom).toHaveBeenCalledWith({ animation: "instant" })
    })

    it("can hold the reader's message in place while older turns are added above it", async () => {
      const { run, presenter, settle } = setup()
      load(run, { messages: [user("u1")], hasOlder: true })
      const scroller = scrollerOf({ scrollHeight: 3000, clientHeight: 500, scrollTop: 100 })
      boxAt(scroller, 0, 500)
      const shown = document.createElement("div")
      shown.dataset.messageId = "u1"
      boxAt(shown, 100, 160)
      scroller.append(shown)
      presenter.attachScroll(stick(scroller))
      scroller.dispatchEvent(new Event("scroll"))
      await flushMicrotasks()
      // The window moved: the reader's message is now rendered 200px lower.
      boxAt(shown, 300, 360)

      presenter.handleSettle()

      expect(scroller.scrollTop).toBe(300)
      presenter.stop()
      await settle()
    })

    it("can scroll a search result into view, flash it, and clear the jump", async () => {
      const { run, store, presenter, settle } = setup()
      load(run, { messages: [user("u1"), assistant("a7")] })
      const target = document.createElement("div")
      target.dataset.messageId = "a7"
      target.scrollIntoView = vi.fn()
      document.body.append(target)
      presenter.attachScroll(stick(null))
      store.setJumpTo("a7")

      presenter.handleSettle()
      await settle()

      expect(target.scrollIntoView).toHaveBeenCalledWith({ block: "center" })
      expect(target.classList.contains("search-hit")).toBe(true)
      expect(store.jumpTo).toBeNull()
    })

    it("can keep a search result waiting while its message is not loaded yet", async () => {
      const { run, store, presenter, settle } = setup()
      load(run, { messages: [user("u1")] })
      presenter.attachScroll(stick(null))
      store.setJumpTo("a9")

      presenter.handleSettle()
      await settle()

      expect(store.jumpTo).toBe("a9")
    })
  })
})
