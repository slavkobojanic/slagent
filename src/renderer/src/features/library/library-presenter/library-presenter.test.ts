import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest"
import { toast } from "sonner"
import type { ChatMessage, ChatSearchResult, ChatSummary, LibraryState } from "@shared/types"
import type { ChatService } from "@/ipc/chat-service/chat-service"
import type { LibraryService } from "@/ipc/library-service/library-service"
import { LibraryPresenter } from "@/features/library/library-presenter/library-presenter"
import { LibraryStore } from "@/mirror/library-store"
import { CommandRegistry, type Command } from "@/state/command-registry"
import { createMockInstance } from "@/test/create-mock-instance"

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

function chat(id: string, overrides: Partial<ChatSummary> = {}): ChatSummary {
  return { id, title: id, pinned: false, pinnedAt: 0, updatedAt: 0, running: false, status: "idle", finishedAt: null, ...overrides }
}

function libraryState(overrides: Partial<LibraryState> = {}): LibraryState {
  return { projects: [], openProjectId: null, chats: [], openChatId: null, ...overrides }
}

function userMessage(text: string): ChatMessage {
  return { id: "m1", role: "user", text, attachments: [] }
}

function commandNamed(registry: CommandRegistry, id: string): Command {
  const command = registry.commands.find((item) => item.id === id)
  if (command === undefined) {
    throw new Error(`no command ${id}`)
  }
  return command
}

describe("LibraryPresenter", () => {
  let library: { [K in keyof LibraryService]: Mock }
  let chatService: { [K in keyof ChatService]: Mock }
  let state: LibraryStore
  let composer: { focus: Mock }
  let registry: CommandRegistry
  let presenter: LibraryPresenter

  beforeEach(() => {
    vi.clearAllMocks()
    library = createMockInstance<LibraryService>([
      "openProject",
      "openChat",
      "pinProject",
      "pinChat",
      "renameChat",
      "chooseFolder",
      "searchChats",
    ])
    chatService = createMockInstance<ChatService>(["newChat", "readTranscript"])
    state = new LibraryStore()
    composer = { focus: vi.fn() }
    registry = new CommandRegistry()
    presenter = new LibraryPresenter(library, chatService, state, composer, registry, { window })
    // Animation frames run at once, so focus happens inside the call that schedules it.
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0)
      return 0
    })
  })

  afterEach(() => {
    presenter.stop()
    vi.restoreAllMocks()
    Reflect.deleteProperty(window.navigator, "clipboard")
  })

  function stubClipboard() {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(window.navigator, "clipboard", { configurable: true, value: { writeText } })
    return writeText
  }

  describe("start", () => {
    it("can enable the new chat command only while a project is open", () => {
      presenter.start()
      const command = commandNamed(registry, "chat.new")

      expect(command.enabled?.()).toBe(false)
      state.setLibrary(libraryState({ openProjectId: "p1" }))

      expect(command.enabled?.()).toBe(true)
    })

    it("can register a number command for each of the first nine chat positions", () => {
      presenter.start()

      const shortcuts = Array.from({ length: 9 }, (_, index) => commandNamed(registry, `chat.open.${index + 1}`).shortcut)

      expect(shortcuts[0]).toEqual({ key: "1", mod: true })
      expect(shortcuts[8]).toEqual({ key: "9", mod: true })
    })

    it("can keep the number commands out of the palette, since the chat list already shows their hints", () => {
      presenter.start()

      expect(commandNamed(registry, "chat.open.1").inPalette).toBe(false)
      expect(commandNamed(registry, "chat.open.9").inPalette).toBe(false)
    })

    it("can leave a number command disabled when no chat sits at its position", () => {
      presenter.start()
      state.setLibrary(libraryState({ openProjectId: "p1", chats: [chat("c1")] }))

      expect(commandNamed(registry, "chat.open.1").enabled?.()).toBe(true)
      expect(commandNamed(registry, "chat.open.2").enabled?.()).toBe(false)
    })

    it("can register its commands only once when started twice", () => {
      presenter.start()
      presenter.start()

      expect(registry.commands).toHaveLength(11)
    })
  })

  describe("stop", () => {
    it("can remove its commands from the registry", () => {
      presenter.start()

      presenter.stop()

      expect(registry.commands).toHaveLength(0)
    })
  })

  describe("openChat", () => {
    it("can open the chat in its project and at the message it is given", async () => {
      await presenter.openChat("c1", "p1", "m1")

      expect(library.openChat).toHaveBeenCalledWith("c1", "p1", "m1")
    })

    it("can show a toast with the error when the chat cannot be opened", async () => {
      library.openChat.mockRejectedValue(new Error("Chat is gone"))

      await presenter.openChat("c1")

      expect(toast.error).toHaveBeenCalledWith("Chat is gone")
    })

    it("can report whether the chat opened, so a search hit only jumps once it is open", async () => {
      expect(await presenter.openChat("c1")).toBe(true)

      library.openChat.mockRejectedValue(new Error("Chat is gone"))
      expect(await presenter.openChat("c2")).toBe(false)
    })
  })

  describe("openProject", () => {
    it("can open the project by its id", async () => {
      await presenter.openProject("p2")

      expect(library.openProject).toHaveBeenCalledWith("p2")
    })
  })

  describe("newChat", () => {
    it("can open the project first when it is not the open one", async () => {
      state.setLibrary(libraryState({ openProjectId: "p1" }))

      await presenter.newChat("p2")

      expect(library.openProject).toHaveBeenCalledWith("p2")
      expect(chatService.newChat).toHaveBeenCalledTimes(1)
    })

    it("can start a draft in the open project without opening it again", async () => {
      state.setLibrary(libraryState({ openProjectId: "p1" }))

      await presenter.newChat("p1")

      expect(library.openProject).not.toHaveBeenCalled()
      expect(chatService.newChat).toHaveBeenCalledTimes(1)
    })

    it("can focus the composer once the draft starts", async () => {
      await presenter.newChat()

      expect(composer.focus).toHaveBeenCalledTimes(1)
    })

    it("can show a toast and still focus the composer when the draft cannot start", async () => {
      chatService.newChat.mockRejectedValue(new Error("No folder"))

      await presenter.newChat()

      expect(toast.error).toHaveBeenCalledWith("No folder")
      expect(composer.focus).toHaveBeenCalledTimes(1)
    })
  })

  describe("library actions", () => {
    it("can pin or unpin a chat", async () => {
      await presenter.pinChat("c1", true)
      await presenter.pinChat("c1", false)

      expect(library.pinChat).toHaveBeenNthCalledWith(1, "c1", true)
      expect(library.pinChat).toHaveBeenNthCalledWith(2, "c1", false)
    })

    it("can pin or unpin a project", async () => {
      await presenter.pinProject("p1", true)

      expect(library.pinProject).toHaveBeenCalledWith("p1", true)
    })

    it("can rename a chat to the title it is given", async () => {
      await presenter.renameChat("c1", "Launch plan")

      expect(library.renameChat).toHaveBeenCalledWith("c1", "Launch plan")
    })

    it("can show a toast when the folder cannot be chosen", async () => {
      library.chooseFolder.mockRejectedValue(new Error("Denied"))

      await presenter.chooseFolder()

      expect(toast.error).toHaveBeenCalledWith("Denied")
    })
  })

  describe("searchChats", () => {
    it("can return the matches from the library service", async () => {
      const result: ChatSearchResult = {
        projectId: "p1",
        projectName: "Atlas",
        chatId: "c1",
        title: "Plan",
        snippet: "",
        messageId: null,
        updatedAt: 1,
      }
      library.searchChats.mockResolvedValue([result])

      await expect(presenter.searchChats("plan")).resolves.toEqual([result])
    })

    it("can leave a search failure to the caller without a toast", async () => {
      library.searchChats.mockRejectedValue(new Error("offline"))

      await expect(presenter.searchChats("plan")).rejects.toThrow("offline")
      expect(toast.error).not.toHaveBeenCalled()
    })
  })

  describe("copyTranscript", () => {
    it("can copy the transcript and confirm", async () => {
      const writeText = stubClipboard()
      chatService.readTranscript.mockResolvedValue([userMessage("hello")])

      await presenter.copyTranscript(chat("c1", { title: "Plan" }))

      expect(writeText).toHaveBeenCalledWith("# Plan\n\nYou\nhello")
      expect(toast.success).toHaveBeenCalledWith("Transcript copied")
    })

    it("can say the chat is empty and copy nothing when it has no messages", async () => {
      const writeText = stubClipboard()
      chatService.readTranscript.mockResolvedValue([])

      await presenter.copyTranscript(chat("c1"))

      expect(writeText).not.toHaveBeenCalled()
      expect(toast.error).toHaveBeenCalledWith("This chat is empty.")
    })

    it("can show the error when the transcript cannot be read", async () => {
      chatService.readTranscript.mockRejectedValue(new Error("disk"))

      await presenter.copyTranscript(chat("c1"))

      expect(toast.error).toHaveBeenCalledWith("disk")
    })
  })

  describe("number commands", () => {
    it("can open the chat at its position in the ordered list and focus the composer", async () => {
      presenter.start()
      state.setLibrary(
        libraryState({
          openProjectId: "p1",
          chats: [chat("old", { updatedAt: 1 }), chat("new", { updatedAt: 9 })],
        }),
      )

      commandNamed(registry, "chat.open.1").run()
      await flush()

      expect(library.openChat.mock.calls[0]?.[0]).toBe("new")
      expect(composer.focus).toHaveBeenCalledTimes(1)
    })
  })
})
