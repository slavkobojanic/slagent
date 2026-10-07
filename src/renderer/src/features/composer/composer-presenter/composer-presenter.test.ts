import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { EMPTY_PERSONALISATION, type AppMeta, type ChatSearchResult, type DiffComment, type FileMatch, type SlashCommand } from "@shared/types"
import type { ChatService } from "@/ipc/chat-service/chat-service"
import { AttachmentsPresenter } from "@/features/composer/attachments-presenter/attachments-presenter"
import type { ComposerAttachment } from "@/features/composer/composer-store/composer-store"
import { ComposerStore } from "@/features/composer/composer-store/composer-store"
import { ComposerPresenter, type KeyEventLike } from "@/features/composer/composer-presenter/composer-presenter"
import { DraftsPresenter } from "@/features/composer/drafts-presenter/drafts-presenter"
import { DraftsStore } from "@/features/composer/drafts-store/drafts-store"
import { PromptHistoryPresenter } from "@/features/composer/prompt-history-presenter/prompt-history-presenter"
import { PromptHistoryStore } from "@/features/composer/prompt-history-store/prompt-history-store"
import { SuggestionsPresenter } from "@/features/composer/suggestions-presenter/suggestions-presenter"
import { CommandRegistry } from "@/state/command-registry"
import { ComposerPort } from "@/state/composer-port"
import { ReviewPresenter } from "@/state/review-presenter"
import { ReviewStore } from "@/state/review-store"
import { LibraryStore } from "@/mirror/library-store"
import { MetaStore } from "@/mirror/meta-store"
import { RunStore, type RunTranscript } from "@/mirror/run-store"
import { createMockInstance } from "@/test/create-mock-instance"

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

function attachment(overrides: Partial<ComposerAttachment> = {}): ComposerAttachment {
  return { id: "a1", name: "a.txt", mimeType: "text/plain", url: "blob:a", path: "", file: new File(["x"], "a.txt"), ...overrides }
}

// Lets resolved promises run their callbacks.
async function flush() {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve()
  }
}

function harness(meta: AppMeta = openMeta) {
  const mirror = { library: new LibraryStore(), meta: new MetaStore(), run: new RunStore() }
  mirror.meta.setMeta(meta)
  mirror.library.setLibrary({ projects: [], openProjectId: "p1", chats: [], openChatId: "c1" })
  const review = new ReviewStore()
  const reviewPresenter = new ReviewPresenter(review)
  const history = new PromptHistoryStore()
  const drafts = new DraftsStore()
  const store = new ComposerStore({ mirror, review, history })
  const draftsPresenter = createMockInstance<DraftsPresenter>(["start", "save", "clear"])
  const historyPresenter = createMockInstance<PromptHistoryPresenter>(["start", "remember"])
  const suggestions = createMockInstance<SuggestionsPresenter>(["start", "stop"])
  const attachments = createMockInstance<AttachmentsPresenter>(["take", "clear", "removeLast", "toPromptFiles", "stop"])
  attachments.take.mockReturnValue([])
  attachments.toPromptFiles.mockResolvedValue([])
  const chat = createMockInstance<ChatService>(["prompt", "abort", "setPlanMode"])
  chat.prompt.mockResolvedValue(undefined)
  chat.abort.mockResolvedValue(undefined)
  chat.setPlanMode.mockResolvedValue(undefined)
  const commands = new CommandRegistry()
  const port = new ComposerPort()
  const notify = vi.fn((_message: string) => undefined)
  const presenter = new ComposerPresenter({
    store,
    drafts,
    draftsPresenter,
    history,
    historyPresenter,
    suggestions,
    attachments,
    chat,
    review: reviewPresenter,
    commands,
    port,
    env: { window },
    notify,
  })
  return { mirror, review, reviewPresenter, history, drafts, store, draftsPresenter, historyPresenter, suggestions, attachments, chat, commands, port, notify, presenter }
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
      const { store, draftsPresenter, presenter } = harness()

      presenter.handleChange(textEvent("hello"))

      expect(store.text).toBe("hello")
      expect(draftsPresenter.save).toHaveBeenCalledWith("p1:c1", "hello")
    })

    it("can open an @ mention at the caret", () => {
      const { store, presenter } = harness()

      presenter.handleChange(textEvent("@a", 2))

      expect(store.mention).toEqual({ query: "a", start: 0 })
    })

    it("can send the text to the history search while it is open", () => {
      const { store, presenter } = harness()
      store.setHistoryQuery("")

      presenter.handleChange(textEvent("zz"))

      expect(store.historyQuery).toBe("zz")
      expect(store.mention).toBeNull()
    })
  })

  describe("handleSelect", () => {
    it("can move the caret and reopen the menu for the text at the caret", () => {
      const { store, presenter } = harness()

      presenter.handleSelect(textEvent("/co", 3))

      expect(store.caret).toBe(3)
      expect(store.slash).toBe("co")
    })
  })

  describe("handleKeyDown", () => {
    it("can submit the prompt on Enter", async () => {
      const { store, chat, presenter } = harness()
      store.setText("hi")

      const event = keyEvent("Enter")
      presenter.handleKeyDown(event)
      await flush()

      expect(event.preventDefault).toHaveBeenCalledTimes(1)
      expect(chat.prompt).toHaveBeenCalledTimes(1)
      expect(chat.prompt.mock.calls[0]?.[0]).toMatchObject({ text: "hi" })
    })

    it("can leave Shift+Enter alone so that it adds a line", () => {
      const { store, chat, presenter } = harness()
      store.setText("hi")

      const event = keyEvent("Enter", { shiftKey: true })
      presenter.handleKeyDown(event)

      expect(event.preventDefault).not.toHaveBeenCalled()
      expect(chat.prompt).not.toHaveBeenCalled()
    })

    it("can leave Enter alone while an input method is composing", () => {
      const { store, chat, presenter } = harness()
      store.setText("hi")
      store.setComposing(true)

      const event = keyEvent("Enter")
      presenter.handleKeyDown(event)

      expect(event.preventDefault).not.toHaveBeenCalled()
      expect(chat.prompt).not.toHaveBeenCalled()
    })

    it("can swallow Enter without sending when the submit button is disabled", () => {
      const { store, chat, presenter } = harness(metaWith({}))
      store.setText("hi")

      const event = keyEvent("Enter")
      presenter.handleKeyDown(event)

      expect(event.preventDefault).toHaveBeenCalledTimes(1)
      expect(chat.prompt).not.toHaveBeenCalled()
    })

    it("can choose the highlighted @ suggestion on Enter", () => {
      const { store, presenter } = harness()
      store.setText("@a")
      presenter.handleChange(textEvent("@a"))
      store.setFileMatches([file])

      presenter.handleKeyDown(keyEvent("Enter", { selectionStart: 2 }))

      expect(store.text).toBe("@a.ts ")
      expect(store.mentions).toEqual([{ path: "src/a.ts", name: "a.ts" }])
    })

    it("can move the highlight down and up, staying inside the menu", () => {
      const { store, presenter } = harness()
      presenter.handleChange(textEvent("@a"))
      store.setFileMatches([file, other])

      presenter.handleKeyDown(keyEvent("ArrowDown"))
      presenter.handleKeyDown(keyEvent("ArrowDown"))
      expect(store.active).toBe(1)

      presenter.handleKeyDown(keyEvent("ArrowUp"))
      expect(store.active).toBe(0)
    })

    it("can close the menu on Escape without stopping the run", () => {
      const { store, chat, presenter } = harness()
      presenter.handleChange(textEvent("@a"))
      store.setFileMatches([file])

      const event = keyEvent("Escape")
      presenter.handleKeyDown(event)

      expect(event.preventDefault).toHaveBeenCalledTimes(1)
      expect(store.mention).toBeNull()
      expect(chat.abort).not.toHaveBeenCalled()
    })

    it("can open history search on Ctrl+R with the current text as its query", () => {
      const { store, presenter } = harness()
      store.setText("draft")

      presenter.handleKeyDown(keyEvent("r", { ctrlKey: true }))

      expect(store.historyQuery).toBe("draft")
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
      const { store, attachments, presenter } = harness()
      store.setAttachments([attachment()])

      const event = keyEvent("Backspace")
      presenter.handleKeyDown(event)

      expect(event.preventDefault).toHaveBeenCalledTimes(1)
      expect(attachments.removeLast).toHaveBeenCalledTimes(1)
    })

    it("can turn plan mode on with Shift+Tab when no menu is open", () => {
      const { chat, presenter } = harness()

      presenter.handleKeyDown(keyEvent("Tab", { shiftKey: true }))

      expect(chat.setPlanMode).toHaveBeenCalledWith(true)
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
      const { store, chat, draftsPresenter, historyPresenter, presenter } = harness()
      store.setText("open @a.ts please")
      store.addMention({ path: "src/a.ts", name: "a.ts" })

      presenter.handleSubmit({ preventDefault: vi.fn() })
      await flush()

      expect(chat.prompt).toHaveBeenCalledWith({
        text: "open @a.ts please",
        mentions: [{ path: "src/a.ts", name: "a.ts" }],
        chatMentions: [],
        files: [],
        comments: [],
        replies: [],
      })
      expect(store.text).toBe("")
      expect(draftsPresenter.clear).toHaveBeenCalledWith("p1:c1")
      expect(historyPresenter.remember).toHaveBeenCalledWith("open @a.ts please")
    })

    it("can drop a mention whose name is no longer in the text", async () => {
      const { store, chat, presenter } = harness()
      store.setText("no mention here")
      store.addMention({ path: "src/a.ts", name: "a.ts" })

      presenter.handleSubmit({ preventDefault: vi.fn() })
      await flush()

      expect(chat.prompt.mock.calls[0]?.[0]).toMatchObject({ mentions: [] })
    })

    it("can send pending review comments with the prompt and take them out of the drafts", async () => {
      const { review, reviewPresenter, chat, presenter } = harness()
      reviewPresenter.addDiffComment(diff)

      presenter.handleSubmit({ preventDefault: vi.fn() })
      await flush()

      expect(chat.prompt.mock.calls[0]?.[0]).toMatchObject({ text: "", comments: [diff], replies: [] })
      expect(review.diffComments).toEqual([])
    })

    it("can do nothing when there is nothing to send", async () => {
      const { store, chat, draftsPresenter, historyPresenter, presenter } = harness()
      store.setText("   ")

      presenter.handleSubmit({ preventDefault: vi.fn() })
      await flush()

      expect(chat.prompt).not.toHaveBeenCalled()
      expect(draftsPresenter.clear).not.toHaveBeenCalled()
      expect(historyPresenter.remember).not.toHaveBeenCalled()
    })

    it("can give the text back to the box when the run drops the prompt in the same chat", async () => {
      const { store, chat, notify, presenter } = harness()
      chat.prompt.mockRejectedValue(new Error("boom"))
      mountTextarea(presenter)
      store.setText("retry me")

      presenter.handleSubmit({ preventDefault: vi.fn() })
      await flush()

      expect(store.text).toBe("retry me")
      expect(notify).toHaveBeenCalledWith("boom")
    })

    it("can restore the review comments when the run drops the prompt in the same chat", async () => {
      const { review, reviewPresenter, chat, presenter } = harness()
      chat.prompt.mockRejectedValue(new Error("boom"))
      mountTextarea(presenter)
      reviewPresenter.addDiffComment(diff)

      presenter.handleSubmit({ preventDefault: vi.fn() })
      await flush()

      expect(review.diffComments).toEqual([diff])
    })

    it("can save the text as the draft of the chat it was sent from when that chat is no longer open", async () => {
      const { mirror, store, review, reviewPresenter, chat, draftsPresenter, presenter } = harness()
      chat.prompt.mockImplementation(async () => {
        mirror.library.setLibrary({ projects: [], openProjectId: "p1", chats: [], openChatId: "c2" })
        throw new Error("boom")
      })
      store.setText("retry me")
      reviewPresenter.addDiffComment(diff)

      presenter.handleSubmit({ preventDefault: vi.fn() })
      await flush()

      expect(draftsPresenter.save).toHaveBeenCalledWith("p1:c1", "retry me")
      expect(review.diffComments).toEqual([])
    })

    it("can leave the box empty after a failed send that had no text", async () => {
      const { store, chat, reviewPresenter, presenter } = harness()
      chat.prompt.mockRejectedValue(new Error("boom"))
      mountTextarea(presenter)
      reviewPresenter.addDiffComment(diff)

      presenter.handleSubmit({ preventDefault: vi.fn() })
      await flush()

      expect(store.text).toBe("")
    })
  })

  describe("togglePlan", () => {
    it("can turn plan mode on", () => {
      const { chat, presenter } = harness()

      presenter.togglePlan()

      expect(chat.setPlanMode).toHaveBeenCalledWith(true)
    })

    it("can turn plan mode off when it is on", () => {
      const { mirror, chat, presenter } = harness()
      mirror.run.setTranscript(transcriptWith({ planMode: true }))

      presenter.togglePlan()

      expect(chat.setPlanMode).toHaveBeenCalledWith(false)
    })

    it("can leave plan mode alone while a run streams", () => {
      const { mirror, chat, presenter } = harness()
      mirror.run.setTranscript(transcriptWith({ streaming: true }))

      presenter.togglePlan()

      expect(chat.setPlanMode).not.toHaveBeenCalled()
    })

    it("can report a plan change the main process refuses", async () => {
      const { chat, notify, presenter } = harness()
      chat.setPlanMode.mockRejectedValue(new Error("refused"))

      presenter.togglePlan()
      await flush()

      expect(notify).toHaveBeenCalledWith("refused")
    })
  })

  describe("handleStop", () => {
    it("can abort the run", async () => {
      const { chat, presenter } = harness()

      await presenter.handleStop()

      expect(chat.abort).toHaveBeenCalledTimes(1)
    })

    it("can report an abort that fails", async () => {
      const { chat, notify, presenter } = harness()
      chat.abort.mockRejectedValue(new Error("stuck"))

      await presenter.handleStop()

      expect(notify).toHaveBeenCalledWith("stuck")
    })
  })

  describe("chooseSuggestion", () => {
    it("can insert the chosen slash command and keep the rest of the text", () => {
      const { store, presenter } = harness()
      store.setCommands([command])
      presenter.handleChange(textEvent("/re"))

      presenter.chooseSuggestion(0)

      expect(store.text).toBe("/review ")
      expect(store.slash).toBeNull()
    })

    it("can choose a $chat mention and remember the chat", () => {
      const { store, presenter } = harness()
      presenter.handleChange(textEvent("$pl"))
      store.setChatMatches([chat])

      presenter.chooseSuggestion(0)

      expect(store.text).toBe("$Plan ")
      expect(store.chatMentions).toEqual([{ projectId: "p1", chatId: "c9", title: "Plan", updatedAt: 7 }])
    })

    it("can put a history prompt into the box", () => {
      const { store, history, presenter } = harness()
      history.replace(["earlier prompt"])
      store.setHistoryQuery("")

      presenter.chooseSuggestion(0)

      expect(store.text).toBe("earlier prompt")
      expect(store.historyQuery).toBeNull()
    })

    it("can ignore a choice with no row at that index", () => {
      const { store, presenter } = harness()
      presenter.handleChange(textEvent("@a"))
      store.setFileMatches([file])

      expect(() => presenter.chooseSuggestion(5)).not.toThrow()
      expect(store.text).toBe("@a")
    })
  })

  describe("hoverSuggestion", () => {
    it("can move the highlight to the row under the pointer", () => {
      const { store, presenter } = harness()

      presenter.hoverSuggestion(2)

      expect(store.active).toBe(2)
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
      const { store, draftsPresenter, presenter } = harness()
      mountTextarea(presenter)

      presenter.fill("hello")

      expect(store.text).toBe("hello")
      expect(draftsPresenter.save).toHaveBeenCalledWith("p1:c1", "hello")
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
      const { drafts, store, draftsPresenter, historyPresenter, suggestions, presenter } = harness()
      drafts.replace({ "p1:c1": "saved draft" })

      presenter.start()

      expect(store.text).toBe("saved draft")
      expect(draftsPresenter.start).toHaveBeenCalledTimes(1)
      expect(historyPresenter.start).toHaveBeenCalledTimes(1)
      expect(suggestions.start).toHaveBeenCalledTimes(1)
    })

    it("can register the Stop and Focus commands while started", () => {
      const { commands, presenter } = harness()

      presenter.start()

      expect(commands.commands.map((item) => item.id)).toEqual(["composer.abort", "composer.focus"])
    })

    it("can remove its commands and stop the suggestions when stopped", () => {
      const { commands, suggestions, presenter } = harness()
      presenter.start()

      presenter.stop()

      expect(commands.commands).toEqual([])
      expect(suggestions.stop).toHaveBeenCalledTimes(1)
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
      const { mirror, drafts, store, attachments, presenter } = harness()
      presenter.start()
      drafts.replace({ "p1:c2": "other chat" })
      store.setCommands([command])

      mirror.library.setLibrary({ projects: [], openProjectId: "p1", chats: [], openChatId: "c2" })

      expect(store.text).toBe("other chat")
      expect(attachments.clear).toHaveBeenCalledTimes(1)
      expect(store.historyDraft).toBe("")
    })
  })

  describe("registered commands", () => {
    it("can stop the run through the Stop command while it streams and no dialog is open", () => {
      const { mirror, commands, chat, presenter } = harness()
      mirror.run.setTranscript(transcriptWith({ streaming: true }))
      presenter.start()

      commands.run("composer.abort")

      expect(chat.abort).toHaveBeenCalledTimes(1)
    })

    it("can leave the Stop command disabled while no run streams", () => {
      const { commands, chat, presenter } = harness()
      presenter.start()

      commands.run("composer.abort")

      expect(chat.abort).not.toHaveBeenCalled()
    })

    it("can leave the Stop command disabled while a dialog is open", () => {
      const { mirror, commands, chat, presenter } = harness()
      mirror.run.setTranscript(transcriptWith({ streaming: true }))
      presenter.start()
      const dialog = document.createElement("div")
      dialog.setAttribute("role", "dialog")
      document.body.appendChild(dialog)

      commands.run("composer.abort")

      expect(chat.abort).not.toHaveBeenCalled()
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
