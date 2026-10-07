import { describe, expect, it } from "vitest"
import type { ChatSearchResult } from "@shared/types"
import { SidebarStore } from "@/features/library/sidebar/sidebar-store/sidebar-store"

const result: ChatSearchResult = {
  projectId: "p1",
  projectName: "Atlas",
  chatId: "c1",
  title: "Plan",
  snippet: "",
  messageId: null,
  updatedAt: 1,
}

describe("SidebarStore", () => {
  describe("setResults", () => {
    it("can start with no results, which means the query is blank", () => {
      expect(new SidebarStore().results).toBeNull()
    })

    it("can hold the matches for the query", () => {
      const store = new SidebarStore()

      store.setResults([result])

      expect(store.results).toEqual([result])
    })
  })

  describe("startRename", () => {
    it("can mark a chat as being renamed with its title as the draft", () => {
      const store = new SidebarStore()

      store.startRename("c1", "Plan")

      expect(store.renamingId).toBe("c1")
      expect(store.draft).toBe("Plan")
    })
  })

  describe("endRename", () => {
    it("can stop renaming without changing the draft", () => {
      const store = new SidebarStore()
      store.startRename("c1", "Plan")

      store.endRename()

      expect(store.renamingId).toBeNull()
      expect(store.draft).toBe("Plan")
    })
  })

  describe("isCollapsed and setCollapsed", () => {
    it("can treat every project as expanded by default", () => {
      expect(new SidebarStore().isCollapsed("p1")).toBe(false)
    })

    it("can collapse one project without touching the others", () => {
      const store = new SidebarStore()

      store.setCollapsed("p1", true)

      expect(store.isCollapsed("p1")).toBe(true)
      expect(store.isCollapsed("p2")).toBe(false)
    })
  })

  describe("setMenuChatId", () => {
    it("can record which chat's menu is open", () => {
      const store = new SidebarStore()

      store.setMenuChatId("c1")

      expect(store.menuChatId).toBe("c1")
    })
  })

  describe("setShowAll", () => {
    it("can switch between the limited and the full chat list", () => {
      const store = new SidebarStore()

      store.setShowAll(true)

      expect(store.showAll).toBe(true)
    })
  })

  describe("setNow and setReduceMotion", () => {
    it("can hold the clock reading and the motion preference", () => {
      const store = new SidebarStore()

      store.setNow(1_000)
      store.setReduceMotion(true)

      expect(store.now).toBe(1_000)
      expect(store.reduceMotion).toBe(true)
    })
  })

  describe("setQuery", () => {
    it("can hold the text typed in the search box", () => {
      const store = new SidebarStore()

      store.setQuery("pla")

      expect(store.query).toBe("pla")
    })
  })
})
