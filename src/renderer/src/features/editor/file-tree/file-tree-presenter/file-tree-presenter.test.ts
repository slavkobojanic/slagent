import { describe, expect, it, vi } from "vitest"
import type { AppMeta, DirectoryEntry, FileView } from "@shared/types"
import { FileTreeStore } from "@/features/editor/file-tree/file-tree-store/file-tree-store"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { MetaStore } from "@/mirror/meta-store/meta-store"
import { EditorPort } from "@/state/editor-port/editor-port"
import { LayoutStore } from "@/state/layout/layout-store/layout-store"
import { createMockInstance } from "@/test/create-mock-instance"
import { FileTreePresenter } from "./file-tree-presenter"

const root: DirectoryEntry[] = [
  { name: "src", dir: true },
  { name: "a.ts", dir: false },
]

function setup(cwd = "/p") {
  const store = new FileTreeStore()
  const api = createMockInstance<API>(["listDirectory", "readFile"])
  vi.mocked(api.listDirectory).mockImplementation(async (path: string) => (path === "" ? root : path === "src" ? [{ name: "index.ts", dir: false }] : null))
  const metaStore = new MetaStore()
  metaStore.setMeta({ cwd } as AppMeta)
  const layoutStore = new LayoutStore()
  const editorPort = new EditorPort()
  const presenter = new FileTreePresenter(store, api, metaStore, layoutStore, editorPort, nullLog())
  return { store, api, metaStore, layoutStore, editorPort, presenter }
}

describe("FileTreePresenter", () => {
  describe("start", () => {
    it("can leave the disk alone while the editor is not showing", () => {
      const { presenter, api } = setup()

      presenter.start()

      expect(api.listDirectory).not.toHaveBeenCalled()
      presenter.stop()
    })

    it("can read the project root once editor mode turns on", async () => {
      const { presenter, api, layoutStore, store } = setup()
      presenter.start()

      layoutStore.setEditorMode(true)
      await vi.waitFor(() => expect(store.rows).toHaveLength(2))

      expect(api.listDirectory).toHaveBeenCalledWith("")
      presenter.stop()
    })

    it("can start over when the project changes", async () => {
      const { presenter, layoutStore, metaStore, store } = setup()
      layoutStore.setEditorMode(true)
      presenter.start()
      await vi.waitFor(() => expect(store.rows).toHaveLength(2))
      await presenter.toggle("src")

      metaStore.setMeta({ cwd: "/other" } as AppMeta)
      await vi.waitFor(() => expect(store.expanded).toEqual([]))

      expect(store.rows).toHaveLength(2)
      presenter.stop()
    })

    it("can forget the tree when editor mode turns off", async () => {
      const { presenter, layoutStore, store } = setup()
      layoutStore.setEditorMode(true)
      presenter.start()
      await vi.waitFor(() => expect(store.rows).toHaveLength(2))

      layoutStore.setEditorMode(false)

      expect(store.rows).toEqual([])
      presenter.stop()
    })
  })

  describe("toggle", () => {
    it("can load a folder the first time it opens", async () => {
      const { presenter, store, api } = setup()
      store.setChildren("", root)

      await presenter.toggle("src")

      expect(api.listDirectory).toHaveBeenCalledWith("src")
      expect(store.rows.map((row) => row.path)).toEqual(["src", "src/index.ts", "a.ts"])
    })

    it("can reuse what it already read when a folder opens again", async () => {
      const { presenter, store, api } = setup()
      store.setChildren("", root)
      await presenter.toggle("src")
      await presenter.toggle("src")

      await presenter.toggle("src")

      expect(api.listDirectory).toHaveBeenCalledTimes(1)
      expect(store.expanded).toEqual(["src"])
    })

    it("can collapse an open folder", async () => {
      const { presenter, store } = setup()
      store.setChildren("", root)
      await presenter.toggle("src")

      await presenter.toggle("src")

      expect(store.expanded).toEqual([])
    })

    it("can release the loading flag when a folder cannot be read", async () => {
      const { presenter, store } = setup()
      store.setChildren("", [{ name: "gone", dir: true }])

      await presenter.toggle("gone")

      expect(store.loading).toEqual([])
      expect(store.error).toBeNull()
    })

    it("can put a failed listing on the store", async () => {
      const { presenter, store, api } = setup()
      store.setChildren("", root)
      vi.mocked(api.listDirectory).mockRejectedValue(new Error("offline"))

      await presenter.toggle("src")

      expect(store.error).toBe("offline")
      expect(store.loading).toEqual([])
    })
  })

  describe("open", () => {
    it("can hand the file to the editor", async () => {
      const { presenter, api, editorPort } = setup()
      const file = { path: "a.ts" } as FileView
      vi.mocked(api.readFile).mockResolvedValue(file)
      const handler = vi.fn()
      editorPort.attach(handler)

      await presenter.open("a.ts")

      expect(api.readFile).toHaveBeenCalledWith("a.ts")
      expect(handler).toHaveBeenCalledWith(file)
    })

    it("can ignore a path that is not a file any more", async () => {
      const { presenter, api, editorPort } = setup()
      vi.mocked(api.readFile).mockResolvedValue(null)
      const handler = vi.fn()
      editorPort.attach(handler)

      await presenter.open("gone.ts")

      expect(handler).not.toHaveBeenCalled()
    })

    it("can put a failed read on the store", async () => {
      const { presenter, api, store } = setup()
      vi.mocked(api.readFile).mockRejectedValue(new Error("denied"))

      await presenter.open("a.ts")

      expect(store.error).toBe("denied")
    })
  })

  describe("refresh", () => {
    it("can read the root and every open folder again", async () => {
      const { presenter, api, store } = setup()
      store.setChildren("", root)
      await presenter.toggle("src")
      vi.mocked(api.listDirectory).mockClear()

      await presenter.refresh()

      expect(vi.mocked(api.listDirectory).mock.calls.map(([path]) => path).sort()).toEqual(["", "src"])
    })
  })
})
