import { describe, expect, it } from "vitest"
import type { LibraryState } from "@shared/types"
import { CHAT_LIMIT } from "@/features/library/sidebar/open-project/chat-list/chat-list-utils"
import { MobileChatListStore } from "@/features/mobile/chat-list/chat-list-store/chat-list-store"
import { LibraryStore } from "@/mirror/library-store/library-store"
import { chat, project } from "@/storybook/sample"

function withLibrary(library: Partial<LibraryState>): MobileChatListStore {
  const libraryStore = new LibraryStore()
  libraryStore.setLibrary({ projects: [], openProjectId: null, chats: [], chatsByProject: {}, openChatId: null, ...library, tasks: library.tasks ?? [] })
  return new MobileChatListStore(libraryStore)
}

describe("MobileChatListStore", () => {
  describe("groups", () => {
    it("can gather every chat project into one Chats group, first", () => {
      const store = withLibrary({
        projects: [project({ id: "code", name: "app" }), project({ id: "a", mode: "chat" }), project({ id: "b", mode: "chat" })],
        chatsByProject: { a: [chat({ id: "c1", updatedAt: 1 })], b: [chat({ id: "c2", updatedAt: 2 })], code: [] },
      })
      const [chats, code] = store.groups
      expect(chats?.name).toBe("No project")
      expect(chats?.newChatProjectId).toBeNull()
      expect(chats?.items.map((item) => [item.chat.id, item.projectId])).toEqual([
        ["c2", "b"],
        ["c1", "a"],
      ])
      expect(code?.name).toBe("app")
      expect(code?.newChatProjectId).toBe("code")
    })

    it("can read the open project's chats from chats", () => {
      const store = withLibrary({ projects: [project({ id: "p1" })], openProjectId: "p1", chats: [chat({ id: "open" })] })
      expect(store.groups[0]?.items.map((item) => item.chat.id)).toEqual(["open"])
    })

    it("can sort code projects by name", () => {
      const store = withLibrary({ projects: [project({ id: "z", name: "zeta" }), project({ id: "a", name: "alpha" })] })
      expect(store.groups.map((group) => group.name)).toEqual(["alpha", "zeta"])
    })

    it("can show a done chat's own status", () => {
      const store = withLibrary({ projects: [project({ id: "p1" })], chatsByProject: { p1: [chat({ id: "c1", status: "done", unread: true })] } })
      expect(store.groups[0]?.items[0]?.status).toBe("done")
    })
  })

  describe("empty", () => {
    it("can be empty when there are no projects", () => {
      expect(withLibrary({}).empty).toBe(true)
    })

    it("can be non-empty when a project exists", () => {
      expect(withLibrary({ projects: [project()] }).empty).toBe(false)
    })
  })

  describe("the chat cap", () => {
    const chats = Array.from({ length: CHAT_LIMIT + 2 }, (_, index) => chat({ id: `c${index}`, updatedAt: index }))

    it("can cap each group at the sidebar's limit", () => {
      const store = withLibrary({ projects: [project({ id: "p1" })], chatsByProject: { p1: chats } })
      const [group] = store.groups
      expect(group?.items).toHaveLength(CHAT_LIMIT)
      expect(group?.hiddenCount).toBe(2)
      expect(group?.canShowLess).toBe(false)
    })

    it("can leave a short group alone", () => {
      const store = withLibrary({ projects: [project({ id: "p1" })], chatsByProject: { p1: chats.slice(0, 3) } })
      const [group] = store.groups
      expect(group?.items).toHaveLength(3)
      expect(group?.hiddenCount).toBe(0)
    })

    it("can reveal and hide the rest of one group without touching the others", () => {
      const store = withLibrary({ projects: [project({ id: "p1", name: "app" }), project({ id: "p2", name: "other" })], chatsByProject: { p1: chats, p2: chats.slice(0, 2) } })

      store.toggleShowAll("p1")

      const [first, second] = store.groups
      expect(store.showAllOf("p1")).toBe(true)
      expect(first?.items).toHaveLength(chats.length)
      expect(first?.hiddenCount).toBe(0)
      expect(first?.canShowLess).toBe(true)
      expect(second?.items).toHaveLength(2)

      store.toggleShowAll("p1")

      expect(store.groups[0]?.items).toHaveLength(CHAT_LIMIT)
    })
  })
})
