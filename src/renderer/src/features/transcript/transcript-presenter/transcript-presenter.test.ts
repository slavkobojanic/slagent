import { afterEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import type { AssistantMessage, ChatMessage, UserMessage } from "@shared/types"
import type { ChatService } from "@/ipc/chat-service/chat-service"
import type { LibraryService } from "@/ipc/library-service/library-service"
import { TranscriptPresenter } from "@/features/transcript/transcript-presenter/transcript-presenter"
import { TranscriptStore } from "@/features/transcript/transcript-store/transcript-store"
import { RunStore } from "@/mirror/run-store"
import type { CommandRegistry } from "@/state/command-registry"
import type { ComposerPort } from "@/state/composer-port"
import type { JumpPort } from "@/state/jump-port"
import type { OverlayStore } from "@/state/overlay-store"
import type { PanelPresenter } from "@/state/panel-presenter"
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
  const chat = createMockInstance<ChatService>(["pageTranscript", "editMessage", "rewind", "undoRewind", "approvePlan"])
  const library = createMockInstance<LibraryService>(["chooseFolder"])
  const composer = createMockInstance<ComposerPort>(["fill"])
  const panel = createMockInstance<PanelPresenter>(["openFile"])
  const overlay = createMockInstance<OverlayStore>(["setOpen"])
  const commands = createMockInstance<CommandRegistry>(["register"])
  const dispose = vi.fn()
  commands.register.mockReturnValue(dispose)
  const jump = createMockInstance<JumpPort>(["attach"])
  const detachJump = vi.fn()
  jump.attach.mockReturnValue(detachJump)
  chat.pageTranscript.mockResolvedValue(undefined)
  const presenter = new TranscriptPresenter(store, run, chat, library, composer, panel, overlay, commands, jump, { window })
  return { run, store, chat, library, composer, panel, overlay, commands, dispose, jump, detachJump, presenter, settle }
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
  vi.mocked(toast.success).mockClear()
})

describe("TranscriptPresenter", () => {
  describe("start and stop", () => {
    it("can register the edit-last command with its shortcut", () => {
      const { presenter, commands } = setup()

      presenter.start()

      expect(commands.register).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "transcript.edit-last",
          label: "Edit last message",
          group: "Actions",
          shortcut: { key: "e", mod: true, shift: true },
        }),
      )
      presenter.stop()
    })

    it("can remove the command when stopped", () => {
      const { presenter, dispose } = setup()
      presenter.start()

      presenter.stop()

      expect(dispose).toHaveBeenCalledTimes(1)
    })

    it("can register the command only once when started twice", () => {
      const { presenter, commands } = setup()

      presenter.start()
      presenter.start()

      expect(commands.register).toHaveBeenCalledTimes(1)
      presenter.stop()
    })

    it("can end an edit when the open chat changes", () => {
      const { run, store, presenter } = setup()
      load(run, { messages: [user("u2")] })
      presenter.start()
      presenter.requestEdit("u2")

      load(run, { messages: [user("x1")], chatId: "c2" })

      expect(store.editingId).toBeNull()
      presenter.stop()
    })
  })

  describe("canEditLast", () => {
    it("can be enabled with an editable message at the live end of an idle chat", () => {
      const { run, presenter } = setup()
      load(run, { messages: [user("u1")] })

      expect(presenter.canEditLast()).toBe(true)
    })

    it("can be disabled while a run is streaming", () => {
      const { run, presenter } = setup()
      load(run, { messages: [user("u1")], streaming: true })

      expect(presenter.canEditLast()).toBe(false)
    })

    it("can be disabled while newer turns are outside the window", () => {
      const { run, presenter } = setup()
      load(run, { messages: [user("u1")], hasNewer: true })

      expect(presenter.canEditLast()).toBe(false)
    })

    it("can be disabled when no message can be edited", () => {
      const { run, presenter } = setup()
      load(run, { messages: [user("u1", { entryId: undefined })] })

      expect(presenter.canEditLast()).toBe(false)
    })
  })

  describe("editLast", () => {
    it("can start editing the last editable message with its text", () => {
      const { run, store, presenter } = setup()
      load(run, { messages: [user("u1"), assistant("a1"), user("u2", { text: "second" })] })

      presenter.editLast()

      expect(store.editingId).toBe("u2")
      expect(store.editDraft).toBe("second")
    })

    it("can do nothing when the window is not at the live end", () => {
      const { run, store, presenter } = setup()
      load(run, { messages: [user("u1")], hasNewer: true })

      presenter.editLast()

      expect(store.editingId).toBeNull()
    })
  })

  describe("requestEdit", () => {
    it("can start editing the latest message right away", () => {
      const { run, store, presenter } = setup()
      load(run, { messages: [user("u1"), user("u2")] })

      presenter.requestEdit("u2")

      expect(store.editingId).toBe("u2")
      expect(store.confirmEditId).toBeNull()
    })

    it("can ask for confirmation before editing an earlier message", () => {
      const { run, store, presenter } = setup()
      load(run, { messages: [user("u1"), user("u2")] })

      presenter.requestEdit("u1")

      expect(store.confirmEditId).toBe("u1")
      expect(store.editingId).toBeNull()
    })

    it("can ask for confirmation for any message when the window is not at the live end", () => {
      const { run, store, presenter } = setup()
      load(run, { messages: [user("u1")], hasNewer: true })

      presenter.requestEdit("u1")

      expect(store.confirmEditId).toBe("u1")
    })
  })

  describe("confirmEdit and cancelConfirm", () => {
    it("can start editing the message whose confirmation was accepted", () => {
      const { run, store, presenter } = setup()
      load(run, { messages: [user("u1"), user("u2")] })
      presenter.requestEdit("u1")

      presenter.confirmEdit()

      expect(store.editingId).toBe("u1")
      expect(store.confirmEditId).toBeNull()
    })

    it("can close the confirmation without editing", () => {
      const { run, store, presenter } = setup()
      load(run, { messages: [user("u1"), user("u2")] })
      presenter.requestEdit("u1")

      presenter.cancelConfirm()

      expect(store.confirmEditId).toBeNull()
      expect(store.editingId).toBeNull()
    })
  })

  describe("saveEdit", () => {
    it("can send the trimmed draft and close the edit once it is saved", async () => {
      const { run, store, chat, presenter } = setup()
      load(run, { messages: [user("u2")] })
      presenter.requestEdit("u2")
      presenter.setEditDraft("  Fix it  ")
      chat.editMessage.mockResolvedValue(undefined)

      await presenter.saveEdit()

      expect(chat.editMessage).toHaveBeenCalledWith("u2", "Fix it")
      expect(store.editingId).toBeNull()
    })

    it("can keep the draft and report the error when saving fails", async () => {
      const { run, store, chat, presenter } = setup()
      load(run, { messages: [user("u2")] })
      presenter.requestEdit("u2")
      chat.editMessage.mockRejectedValue(new Error("Chat is busy"))

      await presenter.saveEdit()

      expect(toast.error).toHaveBeenCalledWith("Chat is busy")
      expect(store.editingId).toBe("u2")
      expect(store.editSaving).toBe(false)
    })

    it("can send nothing for a blank draft", async () => {
      const { run, chat, presenter } = setup()
      load(run, { messages: [user("u2")] })
      presenter.requestEdit("u2")
      presenter.setEditDraft("   ")

      await presenter.saveEdit()

      expect(chat.editMessage).not.toHaveBeenCalled()
    })
  })

  describe("cancelEdit", () => {
    it("can end the edit without saving", () => {
      const { run, store, chat, presenter } = setup()
      load(run, { messages: [user("u2")] })
      presenter.requestEdit("u2")

      presenter.cancelEdit()

      expect(store.editingId).toBeNull()
      expect(chat.editMessage).not.toHaveBeenCalled()
    })
  })

  describe("rewind", () => {
    it("can fill the composer with the rewritten prompt after a chat rewind", async () => {
      const { chat, composer, presenter } = setup()
      chat.rewind.mockResolvedValue({ text: "try again", undo: null })

      await presenter.rewind("u1", "chat")

      expect(chat.rewind).toHaveBeenCalledWith("u1", "chat")
      expect(composer.fill).toHaveBeenCalledWith("try again")
      expect(toast.success).toHaveBeenCalledWith("Chat rewound")
    })

    it("can leave the composer alone after a code-only rewind", async () => {
      const { chat, composer, presenter } = setup()
      chat.rewind.mockResolvedValue({ text: "", undo: null })

      await presenter.rewind("u1", "code")

      expect(composer.fill).not.toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith("Code rewound")
    })

    it("can offer to undo the code when the rewind kept a commit", async () => {
      const { chat, presenter } = setup()
      chat.rewind.mockResolvedValue({ text: "", undo: "abc123" })
      chat.undoRewind.mockResolvedValue(undefined)

      await presenter.rewind("u1", "both")
      const options = vi.mocked(toast.success).mock.calls[0]?.[1] as { action: { onClick: () => void } } | undefined
      options?.action.onClick()

      expect(toast.success).toHaveBeenCalledWith("Code and chat rewound", expect.objectContaining({ action: expect.objectContaining({ label: "Undo code" }) }))
      expect(chat.undoRewind).toHaveBeenCalledWith("abc123")
    })

    it("can report the error and fill nothing when the rewind fails", async () => {
      const { chat, composer, presenter } = setup()
      chat.rewind.mockRejectedValue(new Error("No checkpoint"))

      await presenter.rewind("u1", "both")

      expect(composer.fill).not.toHaveBeenCalled()
      expect(toast.error).toHaveBeenCalledWith("No checkpoint")
    })
  })

  describe("approvePlan", () => {
    it("can approve the plan and clear the approval when it finishes", async () => {
      const { store, chat, presenter } = setup()
      let finish: () => void = () => undefined
      chat.approvePlan.mockReturnValue(new Promise<void>((resolve) => (finish = () => resolve())))

      const pending = presenter.approvePlan()
      expect(store.approving).toBe(true)
      finish()
      await pending

      expect(chat.approvePlan).toHaveBeenCalledTimes(1)
      expect(store.approving).toBe(false)
    })

    it("can report the error and clear the approval when it fails", async () => {
      const { store, chat, presenter } = setup()
      chat.approvePlan.mockRejectedValue(new Error("Run is still going"))

      await presenter.approvePlan()

      expect(toast.error).toHaveBeenCalledWith("Run is still going")
      expect(store.approving).toBe(false)
    })
  })

  describe("chooseFolder and openSettings", () => {
    it("can report the error when the folder cannot be chosen", async () => {
      const { library, presenter } = setup()
      library.chooseFolder.mockRejectedValue(new Error("Dialog closed"))

      await presenter.chooseFolder()

      expect(toast.error).toHaveBeenCalledWith("Dialog closed")
    })

    it("can open the settings dialog to add an API key", () => {
      const { overlay, presenter } = setup()

      presenter.openSettings()

      expect(overlay.setOpen).toHaveBeenCalledWith("settings", true)
    })
  })

  describe("openFile", () => {
    it("can open a file at a line in the right panel", () => {
      const { panel, presenter } = setup()

      presenter.openFile("src/app.ts", 12)

      expect(panel.openFile).toHaveBeenCalledWith("src/app.ts", 12)
    })
  })

  describe("attachScroll", () => {
    it("can record whether the reader is at the bottom", () => {
      const { store, presenter } = setup()

      presenter.attachScroll(stick(null, false))

      expect(store.atBottom).toBe(false)
    })

    it("can ask for the older page when the reader scrolls near the top", async () => {
      const { run, chat, presenter, settle } = setup()
      load(run, { messages: [user("u1")], hasOlder: true })
      const scroller = scrollerOf({ scrollHeight: 3000, clientHeight: 500, scrollTop: 100 })
      presenter.attachScroll(stick(scroller))

      scroller.dispatchEvent(new Event("scroll"))
      await settle()

      expect(chat.pageTranscript).toHaveBeenCalledWith("older")
      presenter.stop()
    })

    it("can ask for the newer page and stop the scroll when the reader nears the bottom", async () => {
      const { run, chat, presenter, settle } = setup()
      load(run, { messages: [user("u1")], hasNewer: true })
      const scroller = scrollerOf({ scrollHeight: 3000, clientHeight: 500, scrollTop: 2400 })
      const context = stick(scroller)
      presenter.attachScroll(context)

      scroller.dispatchEvent(new Event("scroll"))
      await settle()

      expect(context.stopScroll).toHaveBeenCalled()
      expect(chat.pageTranscript).toHaveBeenCalledWith("newer")
      presenter.stop()
    })

    it("can ask for no page while the reader is in the middle of the window", async () => {
      const { run, chat, presenter, settle } = setup()
      load(run, { messages: [user("u1")], hasOlder: true, hasNewer: true })
      const scroller = scrollerOf({ scrollHeight: 3000, clientHeight: 500, scrollTop: 1200 })
      presenter.attachScroll(stick(scroller))

      scroller.dispatchEvent(new Event("scroll"))
      await settle()

      expect(chat.pageTranscript).not.toHaveBeenCalled()
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
      const { run, chat, presenter, settle } = setup()
      load(run, { messages: [user("u1")], hasNewer: true })
      presenter.attachScroll(stick(null))

      presenter.handleScrollDown()
      await settle()

      expect(chat.pageTranscript).toHaveBeenCalledWith("latest")
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
