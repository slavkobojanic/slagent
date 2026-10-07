import { describe, expect, it } from "vitest"
import type { ChatMention, ChatSearchResult, FileMatch, SlashCommand } from "@shared/types"
import { SuggestionsStore } from "@/features/composer/suggestions/suggestions-store/suggestions-store"

const file: FileMatch = { path: "src/a.ts", name: "a.ts" }
const chat: ChatSearchResult = { projectId: "p1", projectName: "Work", chatId: "c1", title: "Plan", snippet: "", messageId: null, updatedAt: 1 }
const command: SlashCommand = { name: "review", insert: "/review", description: "Review the diff", kind: "skill" }

describe("SuggestionsStore", () => {
  describe("menu", () => {
    it("can be null while nothing is typed", () => {
      expect(new SuggestionsStore().menu).toBeNull()
    })

    it("can show @file matches labelled with the name and detailed with the path", () => {
      const store = new SuggestionsStore()
      store.setTriggers({ mention: { query: "a", start: 0 }, chatMention: null, slash: null })
      store.setFileMatches([file])

      expect(store.menu).toEqual({ kind: "file", title: null, empty: null, items: [{ key: "src/a.ts", label: "@a.ts", detail: "src/a.ts" }] })
    })

    it("can hide the file menu while it has no matches", () => {
      const store = new SuggestionsStore()
      store.setTriggers({ mention: { query: "zz", start: 0 }, chatMention: null, slash: null })

      expect(store.menu).toBeNull()
    })

    it("can show $chat matches labelled with the title and detailed with the project", () => {
      const store = new SuggestionsStore()
      store.setTriggers({ mention: null, chatMention: { query: "pl", start: 0 }, slash: null })
      store.setChatMatches([chat])

      expect(store.menu).toEqual({ kind: "chat", title: null, empty: null, items: [{ key: "c1", label: "$Plan", detail: "Work" }] })
    })

    it("can show slash commands with their description, or their kind when there is none", () => {
      const store = new SuggestionsStore()
      store.setTriggers({ mention: null, chatMention: null, slash: "re" })
      store.setCommands([command, { name: "ship", insert: "/ship", description: "", kind: "prompt" }])

      expect(store.menu?.items).toEqual([{ key: "/review", label: "/review", detail: "Review the diff" }])
    })

    it("can label a command without a description by its kind", () => {
      const store = new SuggestionsStore()
      store.setTriggers({ mention: null, chatMention: null, slash: "sh" })
      store.setCommands([{ name: "ship", insert: "/ship", description: "", kind: "prompt" }])

      expect(store.menu?.items).toEqual([{ key: "/ship", label: "/ship", detail: "Prompt template" }])
    })
  })

  describe("commandMatches", () => {
    it("can be empty when no slash command is open", () => {
      const store = new SuggestionsStore()
      store.setCommands([command])

      expect(store.commandMatches).toEqual([])
    })
  })

  describe("setTriggers", () => {
    it("can move the menus to the caret and start them at the first row", () => {
      const store = new SuggestionsStore()
      store.setActive(3)
      store.setTriggers({ mention: { query: "a", start: 0 }, chatMention: null, slash: null })

      expect(store.active).toBe(0)
      expect(store.mention).toEqual({ query: "a", start: 0 })
    })
  })

  describe("dismiss", () => {
    it("can close every menu at once", () => {
      const store = new SuggestionsStore()
      store.setTriggers({ mention: { query: "a", start: 0 }, chatMention: { query: "b", start: 2 }, slash: "c" })
      store.dismiss()

      expect([store.mention, store.chatMention, store.slash]).toEqual([null, null, null])
    })
  })

  describe("addMention", () => {
    it("can add a file mention once per path", () => {
      const store = new SuggestionsStore()
      store.addMention({ path: "src/a.ts", name: "a.ts" })
      store.addMention({ path: "src/a.ts", name: "a.ts" })

      expect(store.mentions).toEqual([{ path: "src/a.ts", name: "a.ts" }])
    })
  })

  describe("addChatMention", () => {
    it("can add a chat mention once per chat", () => {
      const store = new SuggestionsStore()
      const mention: ChatMention = { projectId: "p1", chatId: "c1", title: "Plan", updatedAt: 1 }
      store.addChatMention(mention)
      store.addChatMention(mention)

      expect(store.chatMentions).toEqual([mention])
    })
  })

  describe("resetAfterSend", () => {
    it("can clear the mentions and the menus", () => {
      const store = new SuggestionsStore()
      store.addMention({ path: "src/a.ts", name: "a.ts" })
      store.setTriggers({ mention: { query: "a", start: 0 }, chatMention: null, slash: null })
      store.resetAfterSend()

      expect([store.mentions, store.mention]).toEqual([[], null])
    })
  })

  describe("resetForChat", () => {
    it("can clear the matches and the active row along with the menus", () => {
      const store = new SuggestionsStore()
      store.setFileMatches([file])
      store.setActive(2)
      store.resetForChat()

      expect([store.fileMatches, store.active]).toEqual([[], 0])
    })
  })

  describe("count", () => {
    it("can count the rows of the open menu", () => {
      const store = new SuggestionsStore()
      store.setTriggers({ mention: { query: "a", start: 0 }, chatMention: null, slash: null })
      store.setFileMatches([file, { path: "src/b.ts", name: "b.ts" }])

      expect(store.count).toBe(2)
    })

    it("can be zero while no menu is open", () => {
      expect(new SuggestionsStore().count).toBe(0)
    })
  })
})
