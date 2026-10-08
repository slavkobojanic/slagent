import { describe, expect, it } from "vitest"
import { TerminalStore } from "@/features/terminal/terminal-store/terminal-store"
import type { TerminalSession } from "@shared/types"

function session(id: string, title = "zsh"): TerminalSession {
  return { id, title, cwd: "/code/app" }
}

describe("TerminalStore", () => {
  describe("canCreate", () => {
    it("can create a shell when none is being spawned", () => {
      const store = new TerminalStore()

      expect(store.canCreate).toBe(true)
    })

    it("can refuse a second shell while one is being spawned", () => {
      const store = new TerminalStore()

      store.setBusy(true)

      expect(store.canCreate).toBe(false)
    })
  })

  describe("addTab", () => {
    it("can append the tab and make it the active one", () => {
      const store = new TerminalStore()

      store.addTab(session("a"))
      store.addTab(session("b", "bash"))

      expect(store.tabs.map((tab) => tab.title)).toEqual(["zsh", "bash"])
      expect(store.activeId).toBe("b")
      expect(store.active?.title).toBe("bash")
    })

    it("can clear an error once a shell started", () => {
      const store = new TerminalStore()
      store.setError("no shell")

      store.addTab(session("a"))

      expect(store.error).toBeNull()
    })
  })

  describe("removeTab", () => {
    it("can leave no active tab when the last one closes", () => {
      const store = new TerminalStore()
      store.addTab(session("a"))

      store.removeTab("a")

      expect(store.empty).toBe(true)
      expect(store.activeId).toBeNull()
      expect(store.active).toBeNull()
    })

    it("can select the tab that took the closed one's place", () => {
      const store = new TerminalStore()
      store.addTab(session("a"))
      store.addTab(session("b"))
      store.addTab(session("c"))

      store.removeTab("a")

      expect(store.activeId).toBe("c")
    })

    it("can fall back to the tab before it when the last one closes", () => {
      const store = new TerminalStore()
      store.addTab(session("a"))
      store.addTab(session("b"))

      store.removeTab("b")

      expect(store.activeId).toBe("a")
    })

    it("can keep the active tab when another one closes", () => {
      const store = new TerminalStore()
      store.addTab(session("a"))
      store.addTab(session("b"))

      store.removeTab("a")

      expect(store.activeId).toBe("b")
    })

    it("can ignore an id that is not open", () => {
      const store = new TerminalStore()
      store.addTab(session("a"))

      store.removeTab("gone")

      expect(store.tabs.map((tab) => tab.id)).toEqual(["a"])
      expect(store.activeId).toBe("a")
    })
  })

  describe("setTitle", () => {
    it("can take the title the shell reported", () => {
      const store = new TerminalStore()
      store.addTab(session("a"))

      store.setTitle("a", "~/code/app")

      expect(store.tabs[0]?.title).toBe("~/code/app")
    })

    it("can ignore a blank title or an unknown id", () => {
      const store = new TerminalStore()
      store.addTab(session("a"))

      store.setTitle("a", "   ")
      store.setTitle("gone", "whatever")

      expect(store.tabs[0]?.title).toBe("zsh")
    })
  })

  describe("setExited", () => {
    it("can mark the tab of a shell that quit", () => {
      const store = new TerminalStore()
      store.addTab(session("a"))

      store.setExited("a")

      expect(store.tabs[0]?.exited).toBe(true)
    })
  })
})
