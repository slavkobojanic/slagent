import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ChatSummary, LibraryState } from "@shared/types"
import { ChatSwitchPresenter } from "@/features/library/chat-switch/chat-switch-presenter/chat-switch-presenter"
import { LibraryStore } from "@/mirror/library-store/library-store"
import type { API } from "@/ipc/api"
import { Log, nullLog, type Clock, type Sink } from "@/log/log"
import { RunStore } from "@/mirror/run-store/run-store"
import { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import { PanelStore } from "@/state/panel/panel-store/panel-store"
import { ReviewPresenter } from "@/state/review/review-presenter/review-presenter"
import { ReviewStore } from "@/state/review/review-store/review-store"
import { createMockInstance, type MockInstance } from "@/test/create-mock-instance"

function chat(id: string, overrides: Partial<ChatSummary> = {}): ChatSummary {
  return { id, title: id, pinned: false, pinnedAt: 0, updatedAt: 0, running: false, status: "idle", finishedAt: null, ...overrides }
}

function libraryState(openProjectId: string | null, openChatId: string | null, chats: ChatSummary[] = []): LibraryState {
  return { projects: [], openProjectId, chats, chatsByProject: {}, openChatId }
}

function transcript(chatId: string | null) {
  return {
    chatId,
    messages: [],
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
  }
}

describe("ChatSwitchPresenter", () => {
  let mirror: LibraryStore
  let run: RunStore
  let api: MockInstance<API>
  let panel: PanelPresenter
  let review: ReviewPresenter
  let presenter: ChatSwitchPresenter

  beforeEach(() => {
    mirror = new LibraryStore()
    run = new RunStore()
    api = createMockInstance<API>(["openChat"])
    api.openChat.mockResolvedValue(undefined)
    panel = new PanelPresenter(new PanelStore(), createMockInstance<API>([]), nullLog())
    review = new ReviewPresenter(new ReviewStore(), nullLog())
    vi.spyOn(panel, "reset")
    vi.spyOn(review, "reset")
    presenter = new ChatSwitchPresenter(mirror, run, api, panel, review, nullLog())
    presenter.start()
    // The first library event counts as a switch, so it runs before each test starts from a known chat.
    mirror.setLibrary(libraryState("p1", "c1", [chat("c1")]))
    vi.mocked(panel.reset).mockClear()
    vi.mocked(review.reset).mockClear()
  })

  afterEach(() => {
    presenter.stop()
  })

  describe("library changes", () => {
    it("can reset the panel and the review drafts when the open chat changes", () => {
      mirror.setLibrary(libraryState("p1", "c2", [chat("c1"), chat("c2")]))

      expect(panel.reset).toHaveBeenCalledTimes(1)
      expect(review.reset).toHaveBeenCalledTimes(1)
    })

    it("can reset when the open project changes", () => {
      mirror.setLibrary(libraryState("p2", "c1", [chat("c1")]))

      expect(panel.reset).toHaveBeenCalledTimes(1)
      expect(review.reset).toHaveBeenCalledTimes(1)
    })

    it("can keep the panel and the drafts when a draft becomes its first chat", () => {
      mirror.setLibrary(libraryState("p1", null))
      vi.mocked(panel.reset).mockClear()
      vi.mocked(review.reset).mockClear()

      mirror.setLibrary(libraryState("p1", "c9", [chat("c9")]))

      expect(panel.reset).not.toHaveBeenCalled()
      expect(review.reset).not.toHaveBeenCalled()
    })

    it("can reset when an existing chat is opened from a draft", () => {
      mirror.setLibrary(libraryState("p1", null, [chat("c1")]))
      vi.mocked(panel.reset).mockClear()
      vi.mocked(review.reset).mockClear()

      mirror.setLibrary(libraryState("p1", "c1", [chat("c1")]))

      expect(panel.reset).toHaveBeenCalledTimes(1)
      expect(review.reset).toHaveBeenCalledTimes(1)
    })

    it("can leave the panel and the drafts alone when the library changes without moving", () => {
      mirror.setLibrary(libraryState("p1", "c1", [chat("c1", { title: "Renamed" })]))

      expect(panel.reset).not.toHaveBeenCalled()
      expect(review.reset).not.toHaveBeenCalled()
    })

    it("can stop resetting once stopped", () => {
      presenter.stop()

      mirror.setLibrary(libraryState("p1", "c2", [chat("c2")]))

      expect(panel.reset).not.toHaveBeenCalled()
    })
  })

  describe("openChat", () => {
    function timed() {
      const sink = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } satisfies Sink
      let now = 0
      const clock = { now: () => now, measure: vi.fn() } satisfies Clock
      const log = Log.create({ sink, clock, verbose: true, spec: "*" })
      const advance = (ms: number) => {
        now += ms
      }
      const timings = () => sink.debug.mock.calls.filter((call) => String(call[0]).includes(":time"))
      const timedPresenter = new ChatSwitchPresenter(mirror, run, api, panel, review, log.child("chat-switch"))
      return { clock, advance, timings, timedPresenter }
    }

    it("can call the API with the chat it was given", async () => {
      await presenter.openChat("c2", "p1", "m1")

      expect(api.openChat).toHaveBeenCalledWith("c2", "p1", "m1")
    })

    it("can time the switch until the chat is open and its transcript is shown", async () => {
      const { advance, timings, clock, timedPresenter } = timed()

      await timedPresenter.openChat("c2")
      advance(30)
      mirror.setLibrary(libraryState("p1", "c2", [chat("c1"), chat("c2")]))
      expect(timings()).toHaveLength(0)
      advance(20)
      run.setTranscript(transcript("c2"))

      expect(timings()).toHaveLength(1)
      expect(String(timings()[0][0])).toContain("switch 50ms")
      expect(timings()[0].at(-1)).toEqual({ chatId: "c2" })
      expect(clock.measure).toHaveBeenCalledWith("chat-switch:switch", { start: 0, end: 50 })
    })

    it("can end the earlier switch as superseded when another starts", async () => {
      const { timings, timedPresenter } = timed()

      await timedPresenter.openChat("c2")
      await timedPresenter.openChat("c3")
      mirror.setLibrary(libraryState("p1", "c3", [chat("c3")]))
      run.setTranscript(transcript("c3"))

      expect(timings().map((call) => call.at(-1))).toEqual([{ chatId: "c2", superseded: true }, { chatId: "c3" }])
    })

    it("can end the switch as failed when the chat does not open", async () => {
      const { timings, timedPresenter } = timed()
      api.openChat.mockRejectedValueOnce(new Error("gone"))

      await expect(timedPresenter.openChat("c2")).rejects.toThrow("gone")

      expect(timings().map((call) => call.at(-1))).toEqual([{ chatId: "c2", failed: true }])
    })

    it("can stop watching the switch once stopped", async () => {
      const { timings, timedPresenter } = timed()

      await timedPresenter.openChat("c2")
      timedPresenter.stop()
      mirror.setLibrary(libraryState("p1", "c2", [chat("c2")]))
      run.setTranscript(transcript("c2"))

      expect(timings()).toHaveLength(0)
    })
  })
})
