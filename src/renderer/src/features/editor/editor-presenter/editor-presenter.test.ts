import { describe, expect, it, vi } from "vitest"
import { DEFAULT_EDITOR_PREFS } from "@shared/editor"
import type { AppMeta, FileView, WriteFileResult } from "@shared/types"
import type { EditorEvents, EditorHandle, EditorRuntime } from "@/features/editor/editor-runtime"
import { EditorStore } from "@/features/editor/editor-store/editor-store"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { MetaStore } from "@/mirror/meta-store/meta-store"
import { LayoutStore } from "@/state/layout/layout-store/layout-store"
import { ThemeStore } from "@/state/theme/theme-store/theme-store"
import { createMockInstance } from "@/test/create-mock-instance"
import { EditorPresenter } from "./editor-presenter"

const file = (name: string, overrides: Partial<FileView> = {}): FileView => ({
  path: name,
  absolutePath: `/p/${name}`,
  line: null,
  contents: `${name} body`,
  size: 10,
  mtime: 100,
  binary: false,
  truncated: false,
  ...overrides,
})

function fakeRuntime() {
  const contents = new Map<string, string>()
  let events: EditorEvents | null = null
  const handle: EditorHandle = {
    open: vi.fn((path: string, text: string) => void contents.set(path, text)),
    show: vi.fn(),
    close: vi.fn((path: string) => void contents.delete(path)),
    read: vi.fn((path: string) => contents.get(path) ?? null),
    replace: vi.fn((path: string, text: string) => {
      contents.set(path, text)
      events?.onChange(path)
    }),
    focus: vi.fn(),
    dispose: vi.fn(),
  }
  const runtime: EditorRuntime = {
    mount: vi.fn((_host, handlers) => {
      events = handlers
      return handle
    }),
    setOptions: vi.fn(),
    setTheme: vi.fn(async () => {}),
    loadPacks: vi.fn(async () => {}),
  }
  const type = (path: string, text: string) => {
    contents.set(path, text)
    events?.onChange(path)
  }
  return { runtime, handle, type, events: () => events }
}

function fakeWindow(token = "#123456") {
  return {
    document: { documentElement: {} },
    getComputedStyle: () => ({ getPropertyValue: () => token }),
    requestAnimationFrame: (callback: () => void) => {
      callback()
      return 0
    },
  } as unknown as Window
}

function setup() {
  const store = new EditorStore()
  const api = createMockInstance<API>(["writeFile", "readFile"])
  const themeStore = new ThemeStore()
  const metaStore = new MetaStore()
  const layoutStore = new LayoutStore()
  const fake = fakeRuntime()
  const loadRuntime = vi.fn(async () => fake.runtime)
  const presenter = new EditorPresenter(store, api, themeStore, metaStore, layoutStore, fakeWindow(), loadRuntime, nullLog())
  return { store, api, themeStore, metaStore, layoutStore, loadRuntime, presenter, ...fake }
}

async function mounted() {
  const context = setup()
  context.presenter.openFile(file("a.ts"))
  context.presenter.attachHost(document.createElement("div"))
  await vi.waitFor(() => expect(context.store.status).toBe("ready"))
  return context
}

describe("EditorPresenter", () => {
  describe("openFile", () => {
    it("can open a tab and switch the layout to editor mode", () => {
      const { presenter, store, layoutStore } = setup()

      presenter.openFile(file("a.ts"))

      expect(store.tabs.map((tab) => tab.absolutePath)).toEqual(["/p/a.ts"])
      expect(store.activePath).toBe("/p/a.ts")
      expect(layoutStore.editorMode).toBe(true)
    })

    it("can reuse the tab when the same file opens again", () => {
      const { presenter, store } = setup()
      presenter.openFile(file("a.ts"))
      presenter.openFile(file("b.ts"))

      presenter.openFile(file("a.ts"))

      expect(store.tabs).toHaveLength(2)
      expect(store.activePath).toBe("/p/a.ts")
    })

    it("can refuse a binary file with a notice", () => {
      const { presenter, store } = setup()

      presenter.openFile(file("logo.png", { binary: true, contents: "" }))

      expect(store.tabs).toEqual([])
      expect(store.notice).toBe("logo.png is a binary file.")
    })

    it("can refuse a truncated file with a notice", () => {
      const { presenter, store } = setup()

      presenter.openFile(file("big.log", { truncated: true }))

      expect(store.tabs).toEqual([])
      expect(store.notice).toBe("big.log is too large to edit.")
    })
  })

  describe("attachHost", () => {
    it("can load the runtime, load the packs and set the theme before mounting", async () => {
      const { runtime, store, loadRuntime, themeStore, presenter } = setup()
      themeStore.setPreference("light")

      presenter.attachHost(document.createElement("div"))
      await vi.waitFor(() => expect(store.status).toBe("ready"))

      expect(loadRuntime).toHaveBeenCalledTimes(1)
      expect(runtime.loadPacks).toHaveBeenCalledWith(DEFAULT_EDITOR_PREFS.packs)
      expect(runtime.setTheme).toHaveBeenCalledWith("light", expect.stringContaining('"Slagent Light"'))
      expect(runtime.mount).toHaveBeenCalled()
    })

    it("can open the tabs that were waiting for the editor", async () => {
      const { handle } = await mounted()

      expect(handle.open).toHaveBeenCalledWith("/p/a.ts", "a.ts body")
      expect(handle.show).toHaveBeenCalledWith("/p/a.ts")
    })

    it("can put a load failure on the store", async () => {
      const { presenter, store, loadRuntime } = setup()
      loadRuntime.mockRejectedValueOnce(new Error("no worker"))

      presenter.attachHost(document.createElement("div"))
      await vi.waitFor(() => expect(store.status).toBe("failed"))

      expect(store.error).toBe("no worker")
    })

    it("can retry the load on the next mount after a failure", async () => {
      const { presenter, store, loadRuntime } = setup()
      loadRuntime.mockRejectedValueOnce(new Error("no worker"))
      presenter.attachHost(document.createElement("div"))
      await vi.waitFor(() => expect(store.status).toBe("failed"))

      presenter.attachHost(null)
      presenter.attachHost(document.createElement("div"))
      await vi.waitFor(() => expect(store.status).toBe("ready"))

      expect(loadRuntime).toHaveBeenCalledTimes(2)
    })

    it("can skip mounting when the host went away while the runtime loaded", async () => {
      const { presenter, runtime, loadRuntime } = setup()
      presenter.attachHost(document.createElement("div"))

      presenter.attachHost(null)
      await vi.waitFor(() => expect(loadRuntime).toHaveBeenCalled())
      await Promise.resolve()

      expect(runtime.mount).not.toHaveBeenCalled()
    })

    it("can dispose the editor widget when the host unmounts", async () => {
      const { presenter, handle } = await mounted()

      presenter.attachHost(null)

      expect(handle.dispose).toHaveBeenCalled()
    })

    it("can show the open tabs again on a remount without recreating their models", async () => {
      const { presenter, handle } = await mounted()
      presenter.attachHost(null)
      vi.mocked(handle.open).mockClear()

      presenter.attachHost(document.createElement("div"))
      await vi.waitFor(() => expect(handle.show).toHaveBeenCalledTimes(2))

      expect(handle.open).not.toHaveBeenCalled()
    })
  })

  describe("dirty tracking", () => {
    it("can mark a tab dirty when its contents differ from the saved ones", async () => {
      const { store, type } = await mounted()

      type("/p/a.ts", "edited")

      expect(store.tab("/p/a.ts")?.dirty).toBe(true)
    })

    it("can mark a tab clean again when the edit is undone", async () => {
      const { store, type } = await mounted()
      type("/p/a.ts", "edited")

      type("/p/a.ts", "a.ts body")

      expect(store.tab("/p/a.ts")?.dirty).toBe(false)
    })
  })

  describe("save", () => {
    it("can write the contents with the mtime it read the file at", async () => {
      const { presenter, api, type } = await mounted()
      vi.mocked(api.writeFile).mockResolvedValue({ ok: true, mtime: 200, size: 6 })
      type("/p/a.ts", "edited")

      await presenter.save("/p/a.ts")

      expect(api.writeFile).toHaveBeenCalledWith("/p/a.ts", "edited", 100)
    })

    it("can mark the tab clean with the new mtime after a save", async () => {
      const { presenter, api, store, type } = await mounted()
      vi.mocked(api.writeFile).mockResolvedValue({ ok: true, mtime: 200, size: 6 })
      type("/p/a.ts", "edited")

      await presenter.save("/p/a.ts")

      expect(store.tab("/p/a.ts")).toMatchObject({ dirty: false, mtime: 200, savedContents: "edited", saving: false })
    })

    it("can stay dirty when more typing landed during the save", async () => {
      const { presenter, api, store, type } = await mounted()
      vi.mocked(api.writeFile).mockImplementation(async () => {
        type("/p/a.ts", "edited more")
        return { ok: true, mtime: 200, size: 6 }
      })
      type("/p/a.ts", "edited")

      await presenter.save("/p/a.ts")

      expect(store.tab("/p/a.ts")?.dirty).toBe(true)
    })

    it("can record the on-disk mtime when the file changed underneath", async () => {
      const { presenter, api, store, type } = await mounted()
      vi.mocked(api.writeFile).mockResolvedValue({ ok: false, reason: "conflict", message: "changed", mtime: 555 })
      type("/p/a.ts", "edited")

      await presenter.save("/p/a.ts")

      expect(store.tab("/p/a.ts")?.conflictMtime).toBe(555)
      expect(store.tab("/p/a.ts")?.dirty).toBe(true)
    })

    it("can put another refusal on the tab", async () => {
      const { presenter, api, store } = await mounted()
      const refusal: WriteFileResult = { ok: false, reason: "outside-project", message: "Only files inside the open project can be saved." }
      vi.mocked(api.writeFile).mockResolvedValue(refusal)

      await presenter.save("/p/a.ts")

      expect(store.tab("/p/a.ts")?.error).toBe(refusal.message)
    })

    it("can put a thrown error on the tab and clear the saving flag", async () => {
      const { presenter, api, store } = await mounted()
      vi.mocked(api.writeFile).mockRejectedValue(new Error("offline"))

      await presenter.save("/p/a.ts")

      expect(store.tab("/p/a.ts")).toMatchObject({ error: "offline", saving: false })
    })

    it("can ignore a second save while one is in flight", async () => {
      const { presenter, api, store } = await mounted()
      vi.mocked(api.writeFile).mockReturnValue(new Promise(() => {}))
      void presenter.save("/p/a.ts")

      await presenter.save("/p/a.ts")

      expect(api.writeFile).toHaveBeenCalledTimes(1)
      expect(store.tab("/p/a.ts")?.saving).toBe(true)
    })

    it("can save from the editor's own save command", async () => {
      const { api, events, type } = await mounted()
      vi.mocked(api.writeFile).mockResolvedValue({ ok: true, mtime: 200, size: 6 })
      type("/p/a.ts", "edited")

      events()?.onSave("/p/a.ts")

      expect(api.writeFile).toHaveBeenCalledWith("/p/a.ts", "edited", 100)
    })
  })

  describe("overwrite", () => {
    it("can write again with the mtime found during the conflict", async () => {
      const { presenter, api, store, type } = await mounted()
      vi.mocked(api.writeFile).mockResolvedValueOnce({ ok: false, reason: "conflict", message: "changed", mtime: 555 })
      type("/p/a.ts", "edited")
      await presenter.save("/p/a.ts")
      vi.mocked(api.writeFile).mockResolvedValueOnce({ ok: true, mtime: 600, size: 6 })

      await presenter.overwrite("/p/a.ts")

      expect(api.writeFile).toHaveBeenLastCalledWith("/p/a.ts", "edited", 555)
      expect(store.tab("/p/a.ts")).toMatchObject({ dirty: false, conflictMtime: null, mtime: 600 })
    })
  })

  describe("reloadFromDisk", () => {
    it("can replace the editor contents and stay clean", async () => {
      const { presenter, api, store, handle, type } = await mounted()
      vi.mocked(api.readFile).mockResolvedValue(file("a.ts", { contents: "from disk", mtime: 300 }))
      type("/p/a.ts", "edited")

      await presenter.reloadFromDisk("/p/a.ts")

      expect(handle.replace).toHaveBeenCalledWith("/p/a.ts", "from disk")
      expect(store.tab("/p/a.ts")).toMatchObject({ dirty: false, mtime: 300, savedContents: "from disk" })
    })

    it("can report a file that can no longer be read as text", async () => {
      const { presenter, api, store } = await mounted()
      vi.mocked(api.readFile).mockResolvedValue(null)

      await presenter.reloadFromDisk("/p/a.ts")

      expect(store.tab("/p/a.ts")?.error).toBe("The file can no longer be read as text.")
    })
  })

  describe("closeTab", () => {
    it("can close a clean tab straight away", async () => {
      const { presenter, store, handle } = await mounted()

      presenter.closeTab("/p/a.ts")

      expect(store.tabs).toEqual([])
      expect(handle.close).toHaveBeenCalledWith("/p/a.ts")
    })

    it("can ask before closing a tab with unsaved edits", async () => {
      const { presenter, store, type } = await mounted()
      type("/p/a.ts", "edited")

      presenter.closeTab("/p/a.ts")

      expect(store.closing).toBe("/p/a.ts")
      expect(store.tabs).toHaveLength(1)
    })

    it("can close from the vim close command", async () => {
      const { events, store } = await mounted()

      events()?.onClose("/p/a.ts")

      expect(store.tabs).toEqual([])
    })
  })

  describe("answerClose", () => {
    async function closing() {
      const context = await mounted()
      context.type("/p/a.ts", "edited")
      context.presenter.closeTab("/p/a.ts")
      return context
    }

    it("can keep the tab when cancelled", async () => {
      const { presenter, store } = await closing()

      await presenter.answerClose("cancel")

      expect(store.tabs).toHaveLength(1)
      expect(store.closing).toBeNull()
    })

    it("can drop the edits when discarded", async () => {
      const { presenter, store, api } = await closing()

      await presenter.answerClose("discard")

      expect(store.tabs).toEqual([])
      expect(api.writeFile).not.toHaveBeenCalled()
    })

    it("can save and then close", async () => {
      const { presenter, store, api } = await closing()
      vi.mocked(api.writeFile).mockResolvedValue({ ok: true, mtime: 200, size: 6 })

      await presenter.answerClose("save")

      expect(api.writeFile).toHaveBeenCalledWith("/p/a.ts", "edited", 100)
      expect(store.tabs).toEqual([])
    })

    it("can keep the tab open when saving fails", async () => {
      const { presenter, store, api } = await closing()
      vi.mocked(api.writeFile).mockResolvedValue({ ok: false, reason: "conflict", message: "changed", mtime: 9 })

      await presenter.answerClose("save")

      expect(store.tabs).toHaveLength(1)
    })
  })

  describe("theme and prefs reactions", () => {
    it("can set the matching theme when the app theme flips after the runtime loaded", async () => {
      const { presenter, themeStore, runtime } = await mounted()
      presenter.start()

      themeStore.setPreference("light")
      await vi.waitFor(() => expect(runtime.setTheme).toHaveBeenLastCalledWith("light", expect.any(String)))

      presenter.stop()
    })

    it("can leave the runtime alone when the theme flips before it loaded", () => {
      const { presenter, themeStore, loadRuntime } = setup()
      presenter.start()

      themeStore.setPreference("light")

      expect(loadRuntime).not.toHaveBeenCalled()
      presenter.stop()
    })

    it("can apply new editor options and packs when the settings change", async () => {
      const { presenter, metaStore, runtime } = await mounted()
      presenter.start()

      metaStore.setMeta({ editor: { ...DEFAULT_EDITOR_PREFS, fontSize: 20, packs: ["java"] } } as AppMeta)
      await vi.waitFor(() => expect(runtime.setOptions).toHaveBeenCalledWith(expect.objectContaining({ fontSize: 20 })))

      expect(runtime.loadPacks).toHaveBeenLastCalledWith(["java"])
      presenter.stop()
    })
  })

  describe("stop", () => {
    it("can dispose the editor widget", async () => {
      const { presenter, handle } = await mounted()
      presenter.start()

      presenter.stop()

      expect(handle.dispose).toHaveBeenCalled()
    })
  })
})
