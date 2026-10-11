import { describe, expect, it } from "vitest"
import { EditorStore } from "@/features/editor/editor-store/editor-store"

const file = (name: string) => ({ path: name, absolutePath: `/p/${name}`, contents: `${name} body`, mtime: 10 })

function storeWith(...names: string[]): EditorStore {
  const store = new EditorStore()
  for (const name of names) store.addTab(file(name))
  return store
}

describe("EditorStore", () => {
  describe("addTab", () => {
    it("can open a tab as clean and make it the active one", () => {
      const store = storeWith("a.ts")

      expect(store.tabs[0]).toMatchObject({ path: "a.ts", absolutePath: "/p/a.ts", savedContents: "a.ts body", dirty: false, saving: false })
      expect(store.activePath).toBe("/p/a.ts")
    })

    it("can clear a stale notice", () => {
      const store = new EditorStore()
      store.setNotice("too big")

      store.addTab(file("a.ts"))

      expect(store.notice).toBeNull()
    })
  })

  describe("activeTab", () => {
    it("can be null when no tab is open", () => {
      expect(new EditorStore().activeTab).toBeNull()
    })

    it("can find the tab for the active path", () => {
      const store = storeWith("a.ts", "b.ts")

      store.setActive("/p/a.ts")

      expect(store.activeTab?.path).toBe("a.ts")
    })
  })

  describe("tabItems", () => {
    it("can name each tab after the last segment of its path", () => {
      const store = new EditorStore()
      store.addTab({ path: "src/deep/a.ts", absolutePath: "/p/src/deep/a.ts", contents: "", mtime: 1 })

      expect(store.tabItems).toEqual([{ absolutePath: "/p/src/deep/a.ts", path: "src/deep/a.ts", name: "a.ts", dirty: false }])
    })

    it("can carry the dirty flag", () => {
      const store = storeWith("a.ts")
      store.setDirty("/p/a.ts", true)

      expect(store.tabItems[0]?.dirty).toBe(true)
    })
  })

  describe("banner", () => {
    it("can be null when nothing needs attention", () => {
      expect(storeWith("a.ts").banner).toBeNull()
    })

    it("can ask about a tab that is closing with unsaved edits", () => {
      const store = storeWith("a.ts")
      store.setClosing("/p/a.ts")

      expect(store.banner).toEqual({ kind: "closing", name: "a.ts" })
    })

    it("can report a conflict on the active tab", () => {
      const store = storeWith("a.ts")
      store.setConflict("/p/a.ts", 55)

      expect(store.banner).toEqual({ kind: "conflict", name: "a.ts" })
    })

    it("can ignore a conflict on a tab that is not active", () => {
      const store = storeWith("a.ts", "b.ts")
      store.setConflict("/p/a.ts", 55)

      expect(store.banner).toBeNull()
    })

    it("can report the active tab's error", () => {
      const store = storeWith("a.ts")
      store.setTabError("/p/a.ts", "disk full")

      expect(store.banner).toEqual({ kind: "error", message: "disk full" })
    })

    it("can report a notice when no tab has a problem", () => {
      const store = new EditorStore()
      store.setNotice("logo.png is a binary file.")

      expect(store.banner).toEqual({ kind: "notice", message: "logo.png is a binary file." })
    })

    it("can put the close question ahead of a conflict", () => {
      const store = storeWith("a.ts")
      store.setConflict("/p/a.ts", 55)
      store.setClosing("/p/a.ts")

      expect(store.banner?.kind).toBe("closing")
    })
  })

  describe("hasDirty", () => {
    it("can report an unsaved tab", () => {
      const store = storeWith("a.ts", "b.ts")

      store.setDirty("/p/b.ts", true)

      expect(store.hasDirty).toBe(true)
    })

    it("can report none when every tab is clean", () => {
      expect(storeWith("a.ts").hasDirty).toBe(false)
    })
  })

  describe("removeTab", () => {
    it("can land on the tab that slid into the slot", () => {
      const store = storeWith("a.ts", "b.ts", "c.ts")
      store.setActive("/p/b.ts")

      store.removeTab("/p/b.ts")

      expect(store.activePath).toBe("/p/c.ts")
    })

    it("can land on the last tab when the last one closes", () => {
      const store = storeWith("a.ts", "b.ts")

      store.removeTab("/p/b.ts")

      expect(store.activePath).toBe("/p/a.ts")
    })

    it("can leave the active tab alone when another one closes", () => {
      const store = storeWith("a.ts", "b.ts")
      store.setActive("/p/a.ts")

      store.removeTab("/p/b.ts")

      expect(store.activePath).toBe("/p/a.ts")
    })

    it("can clear the active path when the only tab closes", () => {
      const store = storeWith("a.ts")

      store.removeTab("/p/a.ts")

      expect(store.activePath).toBeNull()
    })

    it("can drop a pending close for the removed tab", () => {
      const store = storeWith("a.ts")
      store.setClosing("/p/a.ts")

      store.removeTab("/p/a.ts")

      expect(store.closing).toBeNull()
    })

    it("can ignore a path that is not open", () => {
      const store = storeWith("a.ts")

      store.removeTab("/p/missing.ts")

      expect(store.tabs).toHaveLength(1)
    })
  })

  describe("setSaved", () => {
    it("can mark the tab clean with the new contents and mtime", () => {
      const store = storeWith("a.ts")
      store.setDirty("/p/a.ts", true)
      store.setConflict("/p/a.ts", 99)
      store.setTabError("/p/a.ts", "boom")

      store.setSaved("/p/a.ts", "next", 20)

      expect(store.tabs[0]).toMatchObject({ savedContents: "next", mtime: 20, dirty: false, conflictMtime: null, error: null })
    })
  })

  describe("setStatus", () => {
    it("can record a failure with its message", () => {
      const store = new EditorStore()

      store.setStatus("failed", "no worker")

      expect(store.status).toBe("failed")
      expect(store.error).toBe("no worker")
    })

    it("can clear the message on a later status", () => {
      const store = new EditorStore()
      store.setStatus("failed", "no worker")

      store.setStatus("ready")

      expect(store.error).toBeNull()
    })
  })
})
