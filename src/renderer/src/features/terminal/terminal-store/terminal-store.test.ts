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

  describe("addTab origin", () => {
    it("can mark a tab as the agent's", () => {
      const store = new TerminalStore()

      store.addTab(session("a"), "task")

      expect(store.tabs[0]?.origin).toBe("task")
    })
  })

  describe("tab groups", () => {
    it("can keep a new tab ungrouped", () => {
      const store = new TerminalStore()

      store.addTab(session("a"))

      expect(store.tabs[0]?.groupId).toBeNull()
      expect(store.activeGroup.map((tab) => tab.id)).toEqual(["a"])
    })

    it("can join two tabs into a group and show both with the active one", () => {
      const store = new TerminalStore()
      store.addTab(session("a"))
      store.addTab(session("b"))

      store.groupWith("a", "b")

      expect(store.tabs.map((tab) => tab.groupId)).toEqual(["g1", "g1"])
      expect(store.activeGroup.map((tab) => tab.id)).toEqual(["a", "b"])
    })

    it("can add a split to a tab that is already grouped", () => {
      const store = new TerminalStore()
      store.addTab(session("a"))
      store.addTab(session("b"))
      store.groupWith("a", "b")
      store.addTab(session("c"))

      store.groupWith("b", "c")

      expect(store.tabs.map((tab) => tab.groupId)).toEqual(["g1", "g1", "g1"])
    })

    it("can show only the active tab when a solo tab is selected", () => {
      const store = new TerminalStore()
      store.addTab(session("a"))
      store.addTab(session("b"))
      store.groupWith("a", "b")
      store.addTab(session("c"))

      store.setActive("c")

      expect(store.activeGroup.map((tab) => tab.id)).toEqual(["c"])
    })

    it("can default a group's split to half and clamp a dragged ratio", () => {
      const store = new TerminalStore()

      expect(store.splitRatio("g1")).toBe(0.5)

      store.setSplitRatio("g1", 0.05)
      expect(store.splitRatio("g1")).toBe(0.2)

      store.setSplitRatio("g1", 0.95)
      expect(store.splitRatio("g1")).toBe(0.8)

      store.setSplitRatio("g1", 0.6)
      expect(store.splitRatio("g1")).toBe(0.6)
    })
  })

  describe("rename", () => {
    it("can start renaming with the tab's title as the draft", () => {
      const store = new TerminalStore()
      store.addTab(session("a"))

      store.setRenaming("a")

      expect(store.renamingId).toBe("a")
      expect(store.renameDraft).toBe("zsh")
    })

    it("can save a custom title that the shell can no longer overwrite", () => {
      const store = new TerminalStore()
      store.addTab(session("a"))
      store.setRenaming("a")
      store.setRenameDraft("dev shell")

      store.renameTab("a", store.renameDraft)
      store.setTitle("a", "~/code/app")

      expect(store.tabs[0]?.title).toBe("dev shell")
      expect(store.tabs[0]?.customTitle).toBe(true)
    })

    it("can keep the current title when the rename is blank", () => {
      const store = new TerminalStore()
      store.addTab(session("a"))
      store.setRenaming("a")
      store.setRenameDraft("   ")

      store.renameTab("a", store.renameDraft)

      expect(store.tabs[0]?.title).toBe("zsh")
      expect(store.tabs[0]?.customTitle).toBe(false)
      expect(store.renamingId).toBeNull()
    })

    it("can stop renaming when the tab closes", () => {
      const store = new TerminalStore()
      store.addTab(session("a"))
      store.setRenaming("a")

      store.removeTab("a")

      expect(store.renamingId).toBeNull()
    })
  })

  describe("revealTab", () => {
    it("can open the drawer over an existing tab", () => {
      const store = new TerminalStore()
      store.addTab(session("a"))
      store.setOpen(false)

      store.revealTab("a")

      expect(store.open).toBe(true)
      expect(store.activeId).toBe("a")
    })

    it("can ignore an id the drawer does not have", () => {
      const store = new TerminalStore()
      store.setOpen(false)

      store.revealTab("gone")

      expect(store.open).toBe(false)
    })
  })
})
