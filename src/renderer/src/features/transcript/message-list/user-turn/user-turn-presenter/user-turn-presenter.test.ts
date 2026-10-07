import { afterEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import type { AssistantMessage, ChatMessage, UserMessage } from "@shared/types"
import type { API } from "@/ipc/api"
import { UserTurnPresenter } from "@/features/transcript/message-list/user-turn/user-turn-presenter/user-turn-presenter"
import { UserTurnStore } from "@/features/transcript/message-list/user-turn/user-turn-store/user-turn-store"
import { RunStore } from "@/mirror/run-store/run-store"
import { ComposerPort } from "@/state/composer-port/composer-port"
import { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
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
  hasNewer?: boolean
  streaming?: boolean
  chatId?: string
}

// Puts a transcript event into the run store, as the mirror does.
function load(run: RunStore, window: TranscriptWindow = {}) {
  run.setTranscript({
    messages: window.messages ?? [],
    windowStart: 0,
    hasOlder: false,
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

function setup() {
  const run = new RunStore()
  const store = new UserTurnStore()
  const api = createMockInstance<API>(["editMessage", "rewind", "undoRewind"])
  const composer = new ComposerPort()
  vi.spyOn(composer, "fill")
  const commands = new CommandRegistry()
  const presenter = new UserTurnPresenter(store, run, api, composer, commands)
  return { run, store, api, composer, commands, presenter }
}

afterEach(() => {
  vi.mocked(toast.error).mockClear()
  vi.mocked(toast.success).mockClear()
})

describe("UserTurnPresenter", () => {
  describe("start and stop", () => {
    it("can register the edit-last command with its shortcut", () => {
      const { presenter, commands } = setup()

      presenter.start()

      expect(commands.commands).toEqual([
        expect.objectContaining({
          id: "transcript.edit-last",
          label: "Edit last message",
          group: "Actions",
          shortcut: { key: "e", mod: true, shift: true },
        }),
      ])
      presenter.stop()
    })

    it("can remove the command when stopped", () => {
      const { presenter, commands } = setup()
      presenter.start()

      presenter.stop()

      expect(commands.commands).toEqual([])
    })

    it("can register the command only once when started twice", () => {
      const { presenter, commands } = setup()

      presenter.start()
      presenter.start()

      expect(commands.commands).toHaveLength(1)
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
      const { run, store, api, presenter } = setup()
      load(run, { messages: [user("u2")] })
      presenter.requestEdit("u2")
      presenter.setEditDraft("  Fix it  ")
      api.editMessage.mockResolvedValue(undefined)

      await presenter.saveEdit()

      expect(api.editMessage).toHaveBeenCalledWith("u2", "Fix it")
      expect(store.editingId).toBeNull()
    })

    it("can keep the draft and report the error when saving fails", async () => {
      const { run, store, api, presenter } = setup()
      load(run, { messages: [user("u2")] })
      presenter.requestEdit("u2")
      api.editMessage.mockRejectedValue(new Error("Chat is busy"))

      await presenter.saveEdit()

      expect(toast.error).toHaveBeenCalledWith("Chat is busy")
      expect(store.editingId).toBe("u2")
      expect(store.editSaving).toBe(false)
    })

    it("can send nothing for a blank draft", async () => {
      const { run, api, presenter } = setup()
      load(run, { messages: [user("u2")] })
      presenter.requestEdit("u2")
      presenter.setEditDraft("   ")

      await presenter.saveEdit()

      expect(api.editMessage).not.toHaveBeenCalled()
    })
  })

  describe("cancelEdit", () => {
    it("can end the edit without saving", () => {
      const { run, store, api, presenter } = setup()
      load(run, { messages: [user("u2")] })
      presenter.requestEdit("u2")

      presenter.cancelEdit()

      expect(store.editingId).toBeNull()
      expect(api.editMessage).not.toHaveBeenCalled()
    })
  })

  describe("rewind", () => {
    it("can fill the composer with the rewritten prompt after a chat rewind", async () => {
      const { api, composer, presenter } = setup()
      api.rewind.mockResolvedValue({ text: "try again", undo: null })

      await presenter.rewind("u1", "chat")

      expect(api.rewind).toHaveBeenCalledWith("u1", "chat")
      expect(composer.fill).toHaveBeenCalledWith("try again")
      expect(toast.success).toHaveBeenCalledWith("Chat rewound")
    })

    it("can leave the composer alone after a code-only rewind", async () => {
      const { api, composer, presenter } = setup()
      api.rewind.mockResolvedValue({ text: "", undo: null })

      await presenter.rewind("u1", "code")

      expect(composer.fill).not.toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith("Code rewound")
    })

    it("can offer to undo the code when the rewind kept a commit", async () => {
      const { api, presenter } = setup()
      api.rewind.mockResolvedValue({ text: "", undo: "abc123" })
      api.undoRewind.mockResolvedValue(undefined)

      await presenter.rewind("u1", "both")
      const options = vi.mocked(toast.success).mock.calls[0]?.[1] as { action: { onClick: () => void } } | undefined
      options?.action.onClick()

      expect(toast.success).toHaveBeenCalledWith("Code and chat rewound", expect.objectContaining({ action: expect.objectContaining({ label: "Undo code" }) }))
      expect(api.undoRewind).toHaveBeenCalledWith("abc123")
    })

    it("can report the error and fill nothing when the rewind fails", async () => {
      const { api, composer, presenter } = setup()
      api.rewind.mockRejectedValue(new Error("No checkpoint"))

      await presenter.rewind("u1", "both")

      expect(composer.fill).not.toHaveBeenCalled()
      expect(toast.error).toHaveBeenCalledWith("No checkpoint")
    })
  })

})
