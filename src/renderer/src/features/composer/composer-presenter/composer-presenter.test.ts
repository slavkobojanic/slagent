import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import { EMPTY_PERSONALISATION, type AppMeta, type ChatMessage, type ChatSearchResult, type DiffComment, type FileMatch, type SlashCommand } from "@shared/types"
import type { API } from "@/ipc/api"
import { Log, nullLog, type Clock, type Sink } from "@/log/log"
import { AttachmentsPresenter } from "@/features/composer/attachments/attachments-presenter/attachments-presenter"
import { AttachmentsStore } from "@/features/composer/attachments/attachments-store/attachments-store"
import { ComposerStore } from "@/features/composer/composer-store/composer-store"
import { ComposerPresenter, type KeyEventLike } from "@/features/composer/composer-presenter/composer-presenter"
import { PromptHistoryPresenter } from "@/features/composer/prompt-history/prompt-history-presenter/prompt-history-presenter"
import { PromptHistoryStore } from "@/features/composer/prompt-history/prompt-history-store/prompt-history-store"
import { SuggestionsPresenter } from "@/features/composer/suggestions/suggestions-presenter/suggestions-presenter"
import { SuggestionsStore } from "@/features/composer/suggestions/suggestions-store/suggestions-store"
import { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import { ComposerPort } from "@/state/composer-port/composer-port"
import { ReviewPresenter } from "@/state/review/review-presenter/review-presenter"
import { ReviewStore } from "@/state/review/review-store/review-store"
import { LibraryStore } from "@/mirror/library-store/library-store"
import { MetaStore } from "@/mirror/meta-store/meta-store"
import { RunStore, type RunTranscript } from "@/mirror/run-store/run-store"
import { createMockInstance } from "@/test/create-mock-instance"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

const DRAFTS_KEY = "slagent:composer-drafts"
const HISTORY_KEY = "slagent:prompt-history"

function metaWith(overrides: Partial<AppMeta>): AppMeta {
  return {
    ready: false,
    error: null,
    cwd: "",
    agentDir: "/agent",
    modelId: null,
    modelName: null,
    modelProvider: null,
    models: [],
    openRouter: { configured: false, source: null, type: null, envKey: false },
    extensions: [],
    extensionErrors: [],
    usageTotals: { tokens: 0, cost: 0, chats: 0 },
    routing: "balance",
    titleModelId: null,
    titleModels: [],
    personalisation: EMPTY_PERSONALISATION,
    ...overrides,
  }
}

const openMeta = metaWith({
  ready: true,
  cwd: "/work",
  modelId: "model",
  openRouter: { configured: true, source: null, type: null, envKey: false },
})

function transcriptWith(overrides: Partial<RunTranscript>): RunTranscript {
  return {
    chatId: "c1",
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
    ...overrides,
  }
}

const file: FileMatch = { path: "src/a.ts", name: "a.ts" }
const other: FileMatch = { path: "src/ab.ts", name: "ab.ts" }
const chat: ChatSearchResult = { projectId: "p1", projectName: "Work", chatId: "c9", title: "Plan", snippet: "", messageId: null, updatedAt: 7 }
const command: SlashCommand = { name: "review", insert: "/review", description: "Review the diff", kind: "skill" }
const diff: DiffComment = { id: "d1", path: "src/a.ts", line: 3, side: "new", code: "x", text: "rename" }

function keyEvent(key: string, init: { shiftKey?: boolean; altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; selectionStart?: number; isComposing?: boolean } = {}): KeyEventLike {
  return {
    key,
    shiftKey: init.shiftKey ?? false,
    altKey: init.altKey ?? false,
    ctrlKey: init.ctrlKey ?? false,
    metaKey: init.metaKey ?? false,
    currentTarget: { selectionStart: init.selectionStart ?? 0 },
    nativeEvent: { isComposing: init.isComposing ?? false },
    preventDefault: vi.fn(),
  }
}

function textEvent(value: string, selectionStart = value.length) {
  return { currentTarget: { value, selectionStart } }
}

// Lets resolved promises run their callbacks.
async function flush() {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve()
  }
}

function harness(meta: AppMeta = openMeta, log: Log = nullLog()) {
  const mirror = { library: new LibraryStore(), meta: new MetaStore(), run: new RunStore() }
  mirror.meta.setMeta(meta)
  mirror.library.setLibrary({ projects: [], openProjectId: "p1", chats: [], chatsByProject: {}, openChatId: "c1" })
  const review = new ReviewStore()
  const reviewPresenter = new ReviewPresenter(review, nullLog())
  const store = new ComposerStore(mirror.library, mirror.meta, mirror.run)
  const api = createMockInstance<API>(["prompt", "abort", "setPlanMode", "pathForFile"])
  const attachments = new AttachmentsPresenter(new AttachmentsStore(), api, window, nullLog())
  vi.spyOn(attachments, "removeLast")
  vi.spyOn(attachments, "follow")
  vi.spyOn(attachments, "stop")
  api.prompt.mockResolvedValue(undefined)
  api.abort.mockResolvedValue(undefined)
  api.setPlanMode.mockResolvedValue(undefined)
  const commands = new CommandRegistry()
  const port = new ComposerPort()
  const history = new PromptHistoryStore()
  const suggestions = new SuggestionsStore()
  const suggestionsPresenter = new SuggestionsPresenter(suggestions, history, api, window, nullLog())
  const presenter = new ComposerPresenter(store, new PromptHistoryPresenter(history, window, nullLog()), suggestionsPresenter, attachments, reviewPresenter, api, commands, port, window, log)
  return { mirror, review, reviewPresenter, store, history, suggestions, suggestionsPresenter, attachments, api, commands, port, presenter }
}

// A real logger that prints only timings, on a clock the test moves by hand.
function timingLog() {
  const sink = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } satisfies Sink
  let now = 0
  const clock = { now: () => now, measure: vi.fn() } satisfies Clock
  const log = Log.create({ sink, clock, verbose: true, spec: "*:time" }).child("composer")
  const advance = (ms: number) => {
    now += ms
  }
  const timings = () => sink.debug.mock.calls.map((call) => ({ line: String(call[0]), data: call.at(-1) }))
  return { log, advance, timings }
}

const asked: ChatMessage = { id: "u1", role: "user", text: "hi", attachments: [] }

function reply(text: string, id = "a1"): ChatMessage {
  return { id, role: "assistant", text, thinking: "", streaming: true, error: null }
}

// Mounts a textarea in the page, as the view does, and returns it.
function mountTextarea(presenter: ComposerPresenter): HTMLTextAreaElement {
  const textarea = document.createElement("textarea")
  document.body.appendChild(textarea)
  presenter.attachTextarea(textarea)
  return textarea
}

describe("ComposerPresenter", () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.mocked(toast.error).mockClear()
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0)
      return 0
    })
  })

  afterEach(() => {
    document.body.innerHTML = ""
    vi.restoreAllMocks()
  })

  describe("handleChange", () => {
    it("can keep the typed text and save it as the open chat's draft", () => {
      const { store, presenter } = harness()

      presenter.handleChange(textEvent("hello"))

      expect(store.text).toBe("hello")
      expect(store.draft("p1:c1")).toBe("hello")
      expect(window.localStorage.getItem(DRAFTS_KEY)).toBe('{"p1:c1":"hello"}')
    })

    it("can leave storage alone when a blank draft has nothing to replace", () => {
      const { presenter } = harness()

      presenter.handleChange(textEvent(" "))

      expect(window.localStorage.getItem(DRAFTS_KEY)).toBeNull()
    })

    it("can keep the draft in memory when storage refuses the write", () => {
      const { store, presenter } = harness()
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("full")
      })

      presenter.handleChange(textEvent("hello"))

      expect(store.draft("p1:c1")).toBe("hello")
    })

    it("can open an @ mention at the caret", () => {
      const { presenter, suggestions } = harness()

      presenter.handleChange(textEvent("@a", 2))

      expect(suggestions.mention).toEqual({ query: "a", start: 0 })
    })

    it("can send the text to the history search while it is open", () => {
      const { history, presenter, suggestions } = harness()
      history.setQuery("")

      presenter.handleChange(textEvent("zz"))

      expect(history.query).toBe("zz")
      expect(suggestions.mention).toBeNull()
    })
  })

  describe("handleSelect", () => {
    it("can move the caret and reopen the menu for the text at the caret", () => {
      const { store, presenter, suggestions } = harness()

      presenter.handleSelect(textEvent("/co", 3))

      expect(store.caret).toBe(3)
      expect(suggestions.slash).toEqual({ query: "co", start: 0 })
    })
  })

  describe("handleKeyDown", () => {
    it("can submit the prompt on Enter", async () => {
      const { store, api, presenter } = harness()
      store.setText("hi")

      const event = keyEvent("Enter")
      presenter.handleKeyDown(event)
      await flush()

      expect(event.preventDefault).toHaveBeenCalledTimes(1)
      expect(api.prompt).toHaveBeenCalledTimes(1)
      expect(api.prompt.mock.calls[0]?.[0]).toMatchObject({ text: "hi" })
    })

    it("can send a command chosen mid-sentence from the start of the prompt", async () => {
      const { store, api, presenter, suggestions } = harness()
      suggestions.setCommands([command])
      presenter.handleChange(textEvent("please /re"))
      presenter.chooseSuggestion(0)
      store.setText("please /review fix the bug")

      const event = keyEvent("Enter")
      presenter.handleKeyDown(event)
      await flush()

      expect(api.prompt).toHaveBeenCalledTimes(1)
      expect(api.prompt.mock.calls[0]?.[0]).toMatchObject({ text: "/review please fix the bug" })
    })

    it("can leave Shift+Enter alone so that it adds a line", () => {
      const { store, api, presenter } = harness()
      store.setText("hi")

      const event = keyEvent("Enter", { shiftKey: true })
      presenter.handleKeyDown(event)

      expect(event.preventDefault).not.toHaveBeenCalled()
      expect(api.prompt).not.toHaveBeenCalled()
    })

    it("can leave Enter alone while an input method is composing", () => {
      const { store, api, presenter } = harness()
      store.setText("hi")
      store.setComposing(true)

      const event = keyEvent("Enter")
      presenter.handleKeyDown(event)

      expect(event.preventDefault).not.toHaveBeenCalled()
      expect(api.prompt).not.toHaveBeenCalled()
    })

    it("can swallow Enter without sending when the submit button is disabled", () => {
      const { store, api, presenter } = harness(metaWith({}))
      store.setText("hi")

      const event = keyEvent("Enter")
      presenter.handleKeyDown(event)

      expect(event.preventDefault).toHaveBeenCalledTimes(1)
      expect(api.prompt).not.toHaveBeenCalled()
    })

    it("can choose the highlighted @ suggestion on Enter", () => {
      const { store, presenter, suggestions } = harness()
      store.setText("@a")
      presenter.handleChange(textEvent("@a"))
      suggestions.setFileMatches([file])

      presenter.handleKeyDown(keyEvent("Enter", { selectionStart: 2 }))

      expect(store.text).toBe("@a.ts ")
      expect(suggestions.mentions).toEqual([{ path: "src/a.ts", name: "a.ts" }])
    })

    it("can move the highlight down and up, staying inside the menu", () => {
      const { presenter, suggestions } = harness()
      presenter.handleChange(textEvent("@a"))
      suggestions.setFileMatches([file, other])

      presenter.handleKeyDown(keyEvent("ArrowDown"))
      presenter.handleKeyDown(keyEvent("ArrowDown"))
      expect(suggestions.active).toBe(1)

      presenter.handleKeyDown(keyEvent("ArrowUp"))
      expect(suggestions.active).toBe(0)
    })

    it("can close the menu on Escape without stopping the run", () => {
      const { api, presenter, suggestions } = harness()
      presenter.handleChange(textEvent("@a"))
      suggestions.setFileMatches([file])

      const event = keyEvent("Escape")
      presenter.handleKeyDown(event)

      expect(event.preventDefault).toHaveBeenCalledTimes(1)
      expect(suggestions.mention).toBeNull()
      expect(api.abort).not.toHaveBeenCalled()
    })

    it("can open history search on Ctrl+R with the current text as its query and close the other menus", () => {
      const { store, history, suggestionsPresenter, presenter, suggestions } = harness()
      suggestionsPresenter.start()
      store.setText("draft")
      suggestions.setTriggers({ mention: { query: "a", start: 0 }, chatMention: null, slash: null })

      presenter.handleKeyDown(keyEvent("r", { ctrlKey: true }))

      expect(history.query).toBe("draft")
      expect(suggestions.mention).toBeNull()
    })

    it("can put the history prompt picked with Enter into the box instead of sending", () => {
      const { store, history, api, presenter } = harness()
      history.replace(["earlier prompt"])
      history.setQuery("")

      presenter.handleKeyDown(keyEvent("Enter"))

      expect(store.text).toBe("earlier prompt")
      expect(api.prompt).not.toHaveBeenCalled()
    })

    it("can recall the newest prompt on ArrowUp and walk back and forward through history", () => {
      const { store, history, presenter } = harness()
      history.replace(["one", "two"])

      presenter.handleKeyDown(keyEvent("ArrowUp"))
      expect(store.text).toBe("two")

      presenter.handleKeyDown(keyEvent("ArrowUp"))
      expect(store.text).toBe("one")

      presenter.handleKeyDown(keyEvent("ArrowDown"))
      expect(store.text).toBe("two")

      presenter.handleKeyDown(keyEvent("ArrowDown"))
      expect(store.text).toBe("")
    })

    it("can leave ArrowUp to the caret when a line break sits above it", () => {
      const { store, history, presenter } = harness()
      history.replace(["one"])
      store.setText("a\nb")

      const event = keyEvent("ArrowUp", { selectionStart: 3 })
      presenter.handleKeyDown(event)

      expect(event.preventDefault).not.toHaveBeenCalled()
      expect(store.text).toBe("a\nb")
    })

    it("can remove the last attachment on Backspace in an empty box", () => {
      const { attachments, presenter } = harness()
      vi.mocked(attachments.removeLast).mockReturnValue(true)

      const event = keyEvent("Backspace")
      presenter.handleKeyDown(event)

      expect(event.preventDefault).toHaveBeenCalledTimes(1)
      expect(attachments.removeLast).toHaveBeenCalledTimes(1)
    })

    it("can leave Backspace alone in an empty box with no attachment", () => {
      const { presenter } = harness()

      const event = keyEvent("Backspace")
      presenter.handleKeyDown(event)

      expect(event.preventDefault).not.toHaveBeenCalled()
    })

    it("can turn plan mode on with Shift+Tab when no menu is open", () => {
      const { api, presenter } = harness()

      presenter.handleKeyDown(keyEvent("Tab", { shiftKey: true }))

      expect(api.setPlanMode).toHaveBeenCalledWith(true)
    })

    it("can leave a plain Tab alone when no menu is open", () => {
      const { presenter } = harness()

      const event = keyEvent("Tab")
      presenter.handleKeyDown(event)

      expect(event.preventDefault).not.toHaveBeenCalled()
    })
  })

  describe("handleSubmit", () => {
    it("can send the text with its file mentions and clear the box", async () => {
      const { store, history, api, presenter, suggestions } = harness()
      presenter.handleChange(textEvent("open @a.ts please"))
      suggestions.addMention({ path: "src/a.ts", name: "a.ts" })

      presenter.handleSubmit({ preventDefault: vi.fn() })
      await flush()

      expect(api.prompt).toHaveBeenCalledWith({
        text: "open @a.ts please",
        mentions: [{ path: "src/a.ts", name: "a.ts" }],
        chatMentions: [],
        files: [],
        comments: [],
        replies: [],
      })
      expect(store.text).toBe("")
      expect(store.draft("p1:c1")).toBe("")
      expect(window.localStorage.getItem(DRAFTS_KEY)).toBe("{}")
      expect(history.items).toEqual(["open @a.ts please"])
      expect(window.localStorage.getItem(HISTORY_KEY)).toBe('["open @a.ts please"]')
    })

    it("can drop a mention whose name is no longer in the text", async () => {
      const { store, api, presenter, suggestions } = harness()
      store.setText("no mention here")
      suggestions.addMention({ path: "src/a.ts", name: "a.ts" })

      presenter.handleSubmit({ preventDefault: vi.fn() })
      await flush()

      expect(api.prompt.mock.calls[0]?.[0]).toMatchObject({ mentions: [] })
    })

    it("can send pending review comments with the prompt and take them out of the drafts", async () => {
      const { review, reviewPresenter, api, presenter } = harness()
      reviewPresenter.addDiffComment(diff)

      presenter.handleSubmit({ preventDefault: vi.fn() })
      await flush()

      expect(api.prompt.mock.calls[0]?.[0]).toMatchObject({ text: "", comments: [diff], replies: [] })
      expect(review.diffComments).toEqual([])
      expect(window.localStorage.getItem(HISTORY_KEY)).toBeNull()
    })

    it("can do nothing when there is nothing to send", async () => {
      const { store, history, api, presenter } = harness()
      store.replaceDrafts({ "p1:c1": "kept" })
      store.setText("   ")

      presenter.handleSubmit({ preventDefault: vi.fn() })
      await flush()

      expect(api.prompt).not.toHaveBeenCalled()
      expect(store.draft("p1:c1")).toBe("kept")
      expect(history.items).toEqual([])
    })

    it("can give the text back to the box when the run drops the prompt in the same chat", async () => {
      const { store, api, presenter } = harness()
      api.prompt.mockRejectedValue(new Error("boom"))
      mountTextarea(presenter)
      store.setText("retry me")

      presenter.handleSubmit({ preventDefault: vi.fn() })
      await flush()

      expect(store.text).toBe("retry me")
      expect(toast.error).toHaveBeenCalledWith("boom")
    })

    it("can restore the review comments when the run drops the prompt in the same chat", async () => {
      const { review, reviewPresenter, api, presenter } = harness()
      api.prompt.mockRejectedValue(new Error("boom"))
      mountTextarea(presenter)
      reviewPresenter.addDiffComment(diff)

      presenter.handleSubmit({ preventDefault: vi.fn() })
      await flush()

      expect(review.diffComments).toEqual([diff])
    })

    it("can save the text as the draft of the chat it was sent from when that chat is no longer open", async () => {
      const { mirror, store, review, reviewPresenter, api, presenter } = harness()
      api.prompt.mockImplementation(async () => {
        mirror.library.setLibrary({ projects: [], openProjectId: "p1", chats: [], chatsByProject: {}, openChatId: "c2" })
        throw new Error("boom")
      })
      store.setText("retry me")
      reviewPresenter.addDiffComment(diff)

      presenter.handleSubmit({ preventDefault: vi.fn() })
      await flush()

      expect(store.draft("p1:c1")).toBe("retry me")
      expect(review.diffComments).toEqual([])
    })

    it("can leave the box empty after a failed send that had no text", async () => {
      const { store, api, reviewPresenter, presenter } = harness()
      api.prompt.mockRejectedValue(new Error("boom"))
      mountTextarea(presenter)
      reviewPresenter.addDiffComment(diff)

      presenter.handleSubmit({ preventDefault: vi.fn() })
      await flush()

      expect(store.text).toBe("")
    })
  })

  describe("first-token timing", () => {
    it("can time a send to the first reply output in the sent chat", async () => {
      const { log, advance, timings } = timingLog()
      const { mirror, store, presenter } = harness(openMeta, log)
      presenter.start()
      store.setText("hi")

      presenter.handleSubmit({ preventDefault: vi.fn() })
      await flush()
      advance(30)
      mirror.run.setTranscript(transcriptWith({ messages: [asked, reply("")], streaming: true }))
      advance(10)
      mirror.run.setTranscript(transcriptWith({ messages: [asked, reply("Hel")], streaming: true }))
      mirror.run.setTranscript(transcriptWith({ messages: [asked, reply("Hello")], streaming: true }))

      expect(timings()).toEqual([{ line: expect.stringContaining("composer:time %cfirst-token 40ms"), data: { chatId: "c1", replyId: "a1" } }])
    })

    it("can wait through output from another chat", async () => {
      const { log, timings } = timingLog()
      const { mirror, store, presenter } = harness(openMeta, log)
      presenter.start()
      store.setText("hi")

      presenter.handleSubmit({ preventDefault: vi.fn() })
      await flush()
      mirror.run.setTranscript(transcriptWith({ chatId: "c2", messages: [reply("elsewhere", "a9")] }))

      expect(timings()).toEqual([])
    })

    it("can end the earlier timer as superseded when a new send comes before its first token", async () => {
      const { log, timings } = timingLog()
      const { mirror, store, presenter } = harness(openMeta, log)
      presenter.start()
      store.setText("one")
      presenter.handleSubmit({ preventDefault: vi.fn() })
      await flush()

      store.setText("two")
      presenter.handleSubmit({ preventDefault: vi.fn() })
      await flush()
      mirror.run.setTranscript(transcriptWith({ messages: [asked, reply("Hello")], streaming: true }))

      expect(timings().map((timing) => timing.data)).toEqual([
        { chatId: "c1", superseded: true },
        { chatId: "c1", replyId: "a1" },
      ])
    })

    it("can end the timer as failed when the send is refused", async () => {
      const { log, timings } = timingLog()
      const { store, api, presenter } = harness(openMeta, log)
      api.prompt.mockRejectedValue(new Error("boom"))
      presenter.start()
      store.setText("hi")

      presenter.handleSubmit({ preventDefault: vi.fn() })
      await flush()

      expect(timings().map((timing) => timing.data)).toEqual([{ chatId: "c1", failed: true }])
    })

    it("can skip timing a prompt sent while a run streams", async () => {
      const { log, timings } = timingLog()
      const { mirror, store, presenter } = harness(openMeta, log)
      mirror.run.setTranscript(transcriptWith({ messages: [asked, reply("Hel")], streaming: true }))
      presenter.start()
      store.setText("and then")

      presenter.handleSubmit({ preventDefault: vi.fn() })
      await flush()
      mirror.run.setTranscript(transcriptWith({ messages: [asked, reply("Hello"), { id: "t1", role: "tool", name: "read", label: "read", args: "", output: "", images: [], running: true, isError: false }], streaming: true }))

      expect(timings()).toEqual([])
    })

    it("can stop waiting when the presenter stops", async () => {
      const { log, timings } = timingLog()
      const { mirror, store, presenter } = harness(openMeta, log)
      presenter.start()
      store.setText("hi")
      presenter.handleSubmit({ preventDefault: vi.fn() })
      await flush()

      presenter.stop()
      mirror.run.setTranscript(transcriptWith({ messages: [asked, reply("Hello")], streaming: true }))

      expect(timings()).toEqual([])
    })
  })

  describe("togglePlan", () => {
    it("can turn plan mode on", () => {
      const { api, presenter } = harness()

      presenter.togglePlan()

      expect(api.setPlanMode).toHaveBeenCalledWith(true)
    })

    it("can turn plan mode off when it is on", () => {
      const { mirror, api, presenter } = harness()
      mirror.run.setTranscript(transcriptWith({ planMode: true }))

      presenter.togglePlan()

      expect(api.setPlanMode).toHaveBeenCalledWith(false)
    })

    it("can leave plan mode alone while a run streams", () => {
      const { mirror, api, presenter } = harness()
      mirror.run.setTranscript(transcriptWith({ streaming: true }))

      presenter.togglePlan()

      expect(api.setPlanMode).not.toHaveBeenCalled()
    })

    it("can report a plan change the main process refuses", async () => {
      const { api, presenter } = harness()
      api.setPlanMode.mockRejectedValue(new Error("refused"))

      presenter.togglePlan()
      await flush()

      expect(toast.error).toHaveBeenCalledWith("refused")
    })
  })

  describe("handleStop", () => {
    it("can abort the run", async () => {
      const { api, presenter } = harness()

      await presenter.handleStop()

      expect(api.abort).toHaveBeenCalledTimes(1)
    })

    it("can report an abort that fails", async () => {
      const { api, presenter } = harness()
      api.abort.mockRejectedValue(new Error("stuck"))

      await presenter.handleStop()

      expect(toast.error).toHaveBeenCalledWith("stuck")
    })
  })

  describe("chooseSuggestion", () => {
    it("can insert the chosen slash command and keep the rest of the text", () => {
      const { store, presenter, suggestions } = harness()
      suggestions.setCommands([command])
      presenter.handleChange(textEvent("/re"))

      presenter.chooseSuggestion(0)

      expect(store.text).toBe("/review ")
      expect(suggestions.slash).toBeNull()
    })

    it("can choose a $chat mention and remember the chat", () => {
      const { store, presenter, suggestions } = harness()
      presenter.handleChange(textEvent("$pl"))
      suggestions.setChatMatches([chat])

      presenter.chooseSuggestion(0)

      expect(store.text).toBe("$Plan ")
      expect(suggestions.chatMentions).toEqual([{ projectId: "p1", chatId: "c9", title: "Plan", updatedAt: 7 }])
    })

    it("can ignore a choice with no row at that index", () => {
      const { store, presenter, suggestions } = harness()
      presenter.handleChange(textEvent("@a"))
      suggestions.setFileMatches([file])

      expect(() => presenter.chooseSuggestion(5)).not.toThrow()
      expect(store.text).toBe("@a")
    })
  })

  describe("chooseHistory", () => {
    it("can put the chosen history prompt into the box and close the search", () => {
      const { store, history, presenter } = harness()
      history.replace(["earlier prompt"])
      history.setQuery("")

      presenter.chooseHistory(0)

      expect(store.text).toBe("earlier prompt")
      expect(history.query).toBeNull()
    })

    it("can leave the box alone when there is no row at that index", () => {
      const { store, history, presenter } = harness()
      history.setQuery("")
      store.setText("kept")

      presenter.chooseHistory(3)

      expect(store.text).toBe("kept")
    })
  })

  describe("focus and fill", () => {
    it("can focus the mounted textarea on the next frame", () => {
      const { presenter } = harness()
      const textarea = mountTextarea(presenter)
      textarea.blur()

      presenter.focus()

      expect(document.activeElement).toBe(textarea)
    })

    it("can fill the box, save the draft, and focus it", () => {
      const { store, presenter } = harness()
      mountTextarea(presenter)

      presenter.fill("hello")

      expect(store.text).toBe("hello")
      expect(store.draft("p1:c1")).toBe("hello")
      expect(document.activeElement?.tagName).toBe("TEXTAREA")
    })

    it("can ignore a fill when no textarea is mounted", () => {
      const { store, presenter } = harness()

      presenter.fill("hello")

      expect(store.text).toBe("")
    })
  })

  describe("attachTextarea", () => {
    it("can take focus when the box mounts with no dialog open", () => {
      const { presenter } = harness()

      const textarea = mountTextarea(presenter)

      expect(document.activeElement).toBe(textarea)
    })

    it("can leave focus alone when a dialog is open", () => {
      const { presenter } = harness()
      const dialog = document.createElement("div")
      dialog.setAttribute("role", "dialog")
      document.body.appendChild(dialog)

      const textarea = mountTextarea(presenter)

      expect(document.activeElement).not.toBe(textarea)
    })
  })

  describe("start and stop", () => {
    it("can load the open chat's saved draft into the box when started", () => {
      const { store, presenter } = harness()
      window.localStorage.setItem(DRAFTS_KEY, '{"p1:c1":"saved draft"}')

      presenter.start()

      expect(store.text).toBe("saved draft")
    })

    it("can start with no drafts when storage holds something unreadable", () => {
      const { store, presenter } = harness()
      window.localStorage.setItem(DRAFTS_KEY, "not json")

      expect(() => presenter.start()).not.toThrow()
      expect(store.drafts).toEqual({})
    })

    it("can drop saved drafts that are not text", () => {
      const { store, presenter } = harness()
      window.localStorage.setItem(DRAFTS_KEY, '{"a":"x","b":3}')

      presenter.start()

      expect(store.drafts).toEqual({ a: "x" })
    })

    it("can load the saved prompt history when started", () => {
      const { history, presenter } = harness()
      window.localStorage.setItem(HISTORY_KEY, '["a", "b"]')

      presenter.start()

      expect(history.items).toEqual(["a", "b"])
    })

    it("can register the Stop and Focus commands while started", () => {
      const { commands, presenter } = harness()

      presenter.start()

      expect(commands.commands.map((item) => item.id)).toEqual(["composer.abort", "composer.focus"])
    })

    it("can remove its commands and release the attachments when stopped", () => {
      const { commands, attachments, presenter } = harness()
      presenter.start()

      presenter.stop()

      expect(commands.commands).toEqual([])
      expect(attachments.stop).toHaveBeenCalledTimes(1)
    })

    it("can detach the focus port when stopped", () => {
      const { port, presenter } = harness()
      presenter.start()
      const textarea = mountTextarea(presenter)
      textarea.blur()

      presenter.stop()
      port.focus()

      expect(document.activeElement).not.toBe(textarea)
    })

    it("can load the new chat's draft and start its menus over when the open chat changes", () => {
      const { mirror, store, history, attachments, presenter, suggestions } = harness()
      presenter.start()
      store.replaceDrafts({ "p1:c2": "other chat" })
      suggestions.setCommands([command])

      mirror.library.setLibrary({ projects: [], openProjectId: "p1", chats: [], chatsByProject: {}, openChatId: "c2" })

      expect(store.text).toBe("other chat")
      expect(attachments.follow).toHaveBeenCalledWith("p1:c2")
      expect(history.draft).toBe("")
    })
  })

  describe("registered commands", () => {
    it("can stop the run through the Stop command while it streams and no dialog is open", () => {
      const { mirror, commands, api, presenter } = harness()
      mirror.run.setTranscript(transcriptWith({ streaming: true }))
      presenter.start()

      commands.run("composer.abort")

      expect(api.abort).toHaveBeenCalledTimes(1)
    })

    it("can leave the Stop command disabled while no run streams", () => {
      const { commands, api, presenter } = harness()
      presenter.start()

      commands.run("composer.abort")

      expect(api.abort).not.toHaveBeenCalled()
    })

    it("can leave the Stop command disabled while a dialog is open", () => {
      const { mirror, commands, api, presenter } = harness()
      mirror.run.setTranscript(transcriptWith({ streaming: true }))
      presenter.start()
      const dialog = document.createElement("div")
      dialog.setAttribute("role", "dialog")
      document.body.appendChild(dialog)

      commands.run("composer.abort")

      expect(api.abort).not.toHaveBeenCalled()
    })

    it("can focus the box through the Focus command", () => {
      const { commands, presenter } = harness()
      presenter.start()
      const textarea = mountTextarea(presenter)
      textarea.blur()

      commands.run("composer.focus")

      expect(document.activeElement).toBe(textarea)
    })
  })
})
