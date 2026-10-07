import { describe, expect, it } from "vitest"
import { EMPTY_PERSONALISATION, type AppMeta, type ChatMention, type ChatSearchResult, type DiffComment, type FileMatch, type ReplyComment, type SlashCommand } from "@shared/types"
import { type ComposerAttachment, ComposerStore } from "@/features/composer/composer-store/composer-store"
import { PromptHistoryStore } from "@/features/composer/prompt-history-store/prompt-history-store"
import { LibraryStore } from "@/mirror/library-store"
import { MetaStore } from "@/mirror/meta-store"
import { RunStore, type RunTranscript } from "@/mirror/run-store"
import { ReviewStore } from "@/state/review-store"

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

function transcriptWith(overrides: Partial<RunTranscript> = {}): RunTranscript {
  return {
    chatId: null,
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

function setup(meta: AppMeta = openMeta) {
  const mirror = { library: new LibraryStore(), meta: new MetaStore(), run: new RunStore() }
  mirror.meta.setMeta(meta)
  const review = new ReviewStore()
  const history = new PromptHistoryStore()
  const store = new ComposerStore({ mirror, review, history })
  return { mirror, review, history, store }
}

const file: FileMatch = { path: "src/a.ts", name: "a.ts" }
const chat: ChatSearchResult = { projectId: "p1", projectName: "Work", chatId: "c1", title: "Plan", snippet: "", messageId: null, updatedAt: 1 }
const command: SlashCommand = { name: "review", insert: "/review", description: "Review the diff", kind: "skill" }

function attachment(overrides: Partial<ComposerAttachment> = {}): ComposerAttachment {
  return { id: "a1", name: "notes.txt", mimeType: "text/plain", url: "blob:notes", path: "", file: new File(["hi"], "notes.txt"), ...overrides }
}

describe("ComposerStore", () => {
  describe("disabled", () => {
    it("can be closed before the app is ready", () => {
      expect(setup(metaWith({ cwd: "/work", modelId: "model" })).store.disabled).toBe(true)
    })

    it("can be closed while no folder is open", () => {
      expect(setup(metaWith({ ready: true, modelId: "model", openRouter: { configured: true, source: null, type: null, envKey: false } })).store.disabled).toBe(true)
    })

    it("can be closed while no model is chosen", () => {
      expect(setup(metaWith({ ready: true, cwd: "/work", openRouter: { configured: true, source: null, type: null, envKey: false } })).store.disabled).toBe(true)
    })

    it("can be closed while no provider is configured", () => {
      expect(setup(metaWith({ ready: true, cwd: "/work", modelId: "model" })).store.disabled).toBe(true)
    })

    it("can be open once ready, configured, with a model and a folder", () => {
      expect(setup().store.disabled).toBe(false)
    })
  })

  describe("placeholder", () => {
    it("can say Starting before the app is ready", () => {
      expect(setup(metaWith({})).store.placeholder).toBe("Starting")
    })

    it("can ask for a folder before one is open", () => {
      expect(setup(metaWith({ ready: true, modelId: "model", openRouter: { configured: true, source: null, type: null, envKey: false } })).store.placeholder).toBe("Choose a folder")
    })

    it("can ask to connect a provider when a folder is open", () => {
      expect(setup(metaWith({ ready: true, cwd: "/work", modelId: "model" })).store.placeholder).toBe("Connect OpenRouter to start")
    })

    it("can ask for an answer while a question is pending", () => {
      const { mirror, store } = setup()
      mirror.run.setTranscript(transcriptWith({ streaming: true, question: { id: "q1", questions: [] } }))

      expect(store.placeholder).toBe("Answer in your own words")
    })

    it("can offer a follow-up while a run streams", () => {
      const { mirror, store } = setup()
      mirror.run.setTranscript(transcriptWith({ streaming: true }))

      expect(store.placeholder).toBe("Queue a follow-up")
    })

    it("can ask for a plan in plan mode", () => {
      const { mirror, store } = setup()
      mirror.run.setTranscript(transcriptWith({ planMode: true }))

      expect(store.placeholder).toBe("Describe what to plan")
    })

    it("can ask for an answer over plan mode while a question is pending", () => {
      const { mirror, store } = setup()
      mirror.run.setTranscript(transcriptWith({ planMode: true, question: { id: "q1", questions: [] } }))

      expect(store.placeholder).toBe("Answer in your own words")
    })

    it("can keep the folder prompt ahead of a pending question", () => {
      const { mirror, store } = setup(metaWith({ ready: true, modelId: "model", openRouter: { configured: true, source: null, type: null, envKey: false } }))
      mirror.run.setTranscript(transcriptWith({ question: { id: "q1", questions: [] } }))

      expect(store.placeholder).toBe("Choose a folder")
    })

    it("can say Describe a change by default", () => {
      expect(setup().store.placeholder).toBe("Describe a change")
    })
  })

  describe("submitStatus and submitDisabled", () => {
    it("can show the stop state and keep the button usable while a run streams", () => {
      const { mirror, store } = setup(metaWith({}))
      mirror.run.setTranscript(transcriptWith({ streaming: true }))

      expect(store.submitStatus).toBe("streaming")
      expect(store.submitDisabled).toBe(false)
    })

    it("can disable the submit button while the box is closed and idle", () => {
      const { store } = setup(metaWith({}))

      expect(store.submitStatus).toBe("ready")
      expect(store.submitDisabled).toBe(true)
    })
  })

  describe("planDisabled", () => {
    it("can disable the plan toggle while the box is closed", () => {
      expect(setup(metaWith({})).store.planDisabled).toBe(true)
    })

    it("can disable the plan toggle while a run streams", () => {
      const { mirror, store } = setup()
      mirror.run.setTranscript(transcriptWith({ streaming: true }))

      expect(store.planDisabled).toBe(true)
    })

    it("can enable the plan toggle when the box is open and idle", () => {
      expect(setup().store.planDisabled).toBe(false)
    })
  })

  describe("draftKey", () => {
    it("can name a draft for a chat with no project and no chat", () => {
      expect(setup().store.draftKey).toBe("none:new")
    })

    it("can name a draft by project and chat", () => {
      const { mirror, store } = setup()
      mirror.library.setLibrary({ projects: [], openProjectId: "p1", chats: [], openChatId: "c1" })

      expect(store.draftKey).toBe("p1:c1")
    })
  })

  describe("menu", () => {
    it("can be null while nothing is typed", () => {
      expect(setup().store.menu).toBeNull()
    })

    it("can show history search with its query in the title and a note when nothing matches", () => {
      const { history, store } = setup()
      history.replace(["a"])
      store.setHistoryQuery("zzz")

      expect(store.menu).toEqual({ kind: "history", title: "History search: zzz", empty: "No matching prompts", items: [] })
    })

    it("can list history matches with their line breaks flattened", () => {
      const { history, store } = setup()
      history.replace(["fix\n  the bug"])
      store.setHistoryQuery("")

      expect(store.menu?.items).toEqual([{ key: "0:fix\n  the bug", label: "fix the bug", detail: "" }])
    })

    it("can show @file matches labelled with the name and detailed with the path", () => {
      const { store } = setup()
      store.setTriggers({ mention: { query: "a", start: 0 }, chatMention: null, slash: null })
      store.setFileMatches([file])

      expect(store.menu).toEqual({ kind: "file", title: null, empty: null, items: [{ key: "src/a.ts", label: "@a.ts", detail: "src/a.ts" }] })
    })

    it("can hide the file menu while it has no matches", () => {
      const { store } = setup()
      store.setTriggers({ mention: { query: "zz", start: 0 }, chatMention: null, slash: null })

      expect(store.menu).toBeNull()
    })

    it("can show $chat matches labelled with the title and detailed with the project", () => {
      const { store } = setup()
      store.setTriggers({ mention: null, chatMention: { query: "pl", start: 0 }, slash: null })
      store.setChatMatches([chat])

      expect(store.menu).toEqual({ kind: "chat", title: null, empty: null, items: [{ key: "c1", label: "$Plan", detail: "Work" }] })
    })

    it("can show slash commands with their description, or their kind when there is none", () => {
      const { store } = setup()
      store.setTriggers({ mention: null, chatMention: null, slash: "re" })
      store.setCommands([command, { name: "ship", insert: "/ship", description: "", kind: "prompt" }])

      expect(store.menu?.items).toEqual([{ key: "/review", label: "/review", detail: "Review the diff" }])
    })

    it("can label a command without a description by its kind", () => {
      const { store } = setup()
      store.setTriggers({ mention: null, chatMention: null, slash: "sh" })
      store.setCommands([{ name: "ship", insert: "/ship", description: "", kind: "prompt" }])

      expect(store.menu?.items).toEqual([{ key: "/ship", label: "/ship", detail: "Prompt template" }])
    })

    it("can prefer history search over the other menus", () => {
      const { history, store } = setup()
      history.replace(["one"])
      store.setTriggers({ mention: { query: "a", start: 0 }, chatMention: null, slash: null })
      store.setFileMatches([file])
      store.setHistoryQuery("")

      expect(store.menu?.kind).toBe("history")
    })
  })

  describe("commandMatches", () => {
    it("can be empty when no slash command is open", () => {
      const { store } = setup()
      store.setCommands([command])

      expect(store.commandMatches).toEqual([])
    })
  })

  describe("pending review comments", () => {
    it("can label pending comments the way the summary reads them", () => {
      const { review, store } = setup()
      review.setReplyComments([{ id: "r1", messageId: "m1", block: "", quote: "a  b\n c", text: "why" } satisfies ReplyComment])
      review.setDiffComments([{ id: "d1", path: "src/app/main.ts", line: 12, side: "new", code: "", text: "rename" } satisfies DiffComment])

      expect(store.pendingLabel).toBe("1 reply comment and 1 diff comment")
      expect(store.pendingReplies).toEqual([{ id: "r1", quote: "a b c", text: "why" }])
      expect(store.pendingDiffs).toEqual([{ id: "d1", location: "main.ts:12", text: "rename" }])
    })

    it("can count every pending comment for the send check", () => {
      const { review, store } = setup()
      review.setDiffComments([{ id: "d1", path: "a.ts", line: 1, side: "new", code: "", text: "x" } satisfies DiffComment])

      expect(store.pendingCount).toBe(1)
    })
  })

  describe("attachmentChips", () => {
    it("can show a thumbnail for an image and no thumbnail for other files", () => {
      const { store } = setup()
      store.setAttachments([
        attachment({ id: "img", name: "shot.png", mimeType: "image/png", url: "blob:shot" }),
        attachment({ id: "doc", name: "spec.pdf", mimeType: "application/pdf", url: "blob:spec" }),
      ])

      expect(store.attachmentChips).toEqual([
        { id: "img", name: "shot.png", imageUrl: "blob:shot" },
        { id: "doc", name: "spec.pdf", imageUrl: null },
      ])
    })
  })

  describe("setTriggers", () => {
    it("can move the menus to the caret and start them at the first row", () => {
      const { store } = setup()
      store.setActive(3)
      store.setTriggers({ mention: { query: "a", start: 0 }, chatMention: null, slash: null })

      expect(store.active).toBe(0)
      expect(store.mention).toEqual({ query: "a", start: 0 })
    })
  })

  describe("toggleHistorySearch", () => {
    it("can open the search with the current text as its query", () => {
      const { store } = setup()
      store.toggleHistorySearch("draft")

      expect(store.historyQuery).toBe("draft")
    })

    it("can close the search when it is already open", () => {
      const { store } = setup()
      store.toggleHistorySearch("draft")
      store.toggleHistorySearch("draft")

      expect(store.historyQuery).toBeNull()
    })
  })

  describe("dismissTriggers", () => {
    it("can close every menu and the history search at once", () => {
      const { store } = setup()
      store.setTriggers({ mention: { query: "a", start: 0 }, chatMention: { query: "b", start: 2 }, slash: "c" })
      store.setHistoryQuery("q")
      store.dismissTriggers()

      expect([store.mention, store.chatMention, store.slash, store.historyQuery]).toEqual([null, null, null, null])
    })
  })

  describe("addMention", () => {
    it("can add a file mention once per path", () => {
      const { store } = setup()
      store.addMention({ path: "src/a.ts", name: "a.ts" })
      store.addMention({ path: "src/a.ts", name: "a.ts" })

      expect(store.mentions).toEqual([{ path: "src/a.ts", name: "a.ts" }])
    })
  })

  describe("addChatMention", () => {
    it("can add a chat mention once per chat", () => {
      const { store } = setup()
      const mention: ChatMention = { projectId: "p1", chatId: "c1", title: "Plan", updatedAt: 1 }
      store.addChatMention(mention)
      store.addChatMention(mention)

      expect(store.chatMentions).toEqual([mention])
    })
  })

  describe("resetAfterSend", () => {
    it("can clear the mentions, the menus, and the history position", () => {
      const { store } = setup()
      store.addMention({ path: "src/a.ts", name: "a.ts" })
      store.setTriggers({ mention: { query: "a", start: 0 }, chatMention: null, slash: null })
      store.setHistoryIndex(2)
      store.resetAfterSend()

      expect([store.mentions, store.mention, store.historyIndex]).toEqual([[], null, null])
    })
  })

  describe("resetForChat", () => {
    it("can clear the history draft along with the menus", () => {
      const { store } = setup()
      store.setHistoryDraft("unsent")
      store.resetForChat()

      expect(store.historyDraft).toBe("")
    })
  })
})
