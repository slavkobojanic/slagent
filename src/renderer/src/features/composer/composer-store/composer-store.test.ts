import { describe, expect, it } from "vitest"
import { EMPTY_PERSONALISATION, type AppMeta, type ChatMessage } from "@shared/types"
import { ComposerStore } from "@/features/composer/composer-store/composer-store"
import { LibraryStore } from "@/mirror/library-store/library-store"
import { MetaStore } from "@/mirror/meta-store/meta-store"
import { RunStore, type RunTranscript } from "@/mirror/run-store/run-store"

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
  const store = new ComposerStore(mirror.library, mirror.meta, mirror.run)
  return { mirror, store }
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

  describe("replyId", () => {
    const asked: ChatMessage = { id: "u1", role: "user", text: "hi", attachments: [] }
    const empty: ChatMessage = { id: "a1", role: "assistant", text: "", thinking: "", streaming: true, error: null }
    const thinking: ChatMessage = { ...empty, thinking: "hmm" }

    it("can be null when the latest prompt has no output yet", () => {
      const { mirror, store } = setup()
      mirror.run.setTranscript(transcriptWith({ messages: [{ ...thinking, id: "a0" }, asked, empty] }))

      expect(store.replyId).toBeNull()
    })

    it("can name the reply once it shows thinking or text", () => {
      const { mirror, store } = setup()
      mirror.run.setTranscript(transcriptWith({ messages: [asked, thinking] }))

      expect(store.replyId).toBe("a1")
    })
  })

  describe("draftKey", () => {
    it("can name a draft for a chat with no project and no chat", () => {
      expect(setup().store.draftKey).toBe("none:new")
    })

    it("can name a draft by project and chat", () => {
      const { mirror, store } = setup()
      mirror.library.setLibrary({ projects: [], openProjectId: "p1", chats: [], chatsByProject: {}, openChatId: "c1" })

      expect(store.draftKey).toBe("p1:c1")
    })
  })

  describe("draft", () => {
    it("can return an empty string for a chat with no draft", () => {
      expect(setup().store.draft("p:c")).toBe("")
    })

    it("can return the text written for the chat", () => {
      const { store } = setup()
      store.writeDraft("p:c", "hello")

      expect(store.draft("p:c")).toBe("hello")
    })
  })

  describe("writeDraft", () => {
    it("can save a draft and report the change", () => {
      expect(setup().store.writeDraft("p:c", "hello")).toBe(true)
    })

    it("can remove a draft when its text is blank, and report the change", () => {
      const { store } = setup()
      store.writeDraft("p:c", "hello")

      expect(store.writeDraft("p:c", "   ")).toBe(true)
      expect(store.draft("p:c")).toBe("")
    })

    it("can report no change when a blank write has no draft to remove", () => {
      expect(setup().store.writeDraft("p:c", "")).toBe(false)
    })

    it("can drop the oldest drafts once there are more than 100", () => {
      const { store } = setup()
      for (let index = 0; index <= 100; index += 1) {
        store.writeDraft(`k${index}`, `t${index}`)
      }

      expect(store.draft("k0")).toBe("")
      expect(store.draft("k1")).toBe("t1")
      expect(store.draft("k100")).toBe("t100")
    })
  })

  describe("replaceDrafts", () => {
    it("can swap in the drafts that were loaded", () => {
      const { store } = setup()
      store.replaceDrafts({ "p:c": "loaded" })

      expect(store.draft("p:c")).toBe("loaded")
    })
  })
})
