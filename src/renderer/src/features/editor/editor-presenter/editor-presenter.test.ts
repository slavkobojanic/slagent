import { afterEach, describe, expect, it, vi } from "vitest"
import type { AppMeta, FileView } from "@shared/types"
import { EditorStore } from "@/features/editor/editor-store/editor-store"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { MetaStore } from "@/mirror/meta-store/meta-store"
import { LayoutStore } from "@/state/layout/layout-store/layout-store"
import { ThemeStore } from "@/state/theme/theme-store/theme-store"
import { createMockInstance } from "@/test/create-mock-instance"
import { EditorPresenter } from "./editor-presenter"

const URL_A = "http://127.0.0.1:4000/?tkn=abc&folder=%2Fp"

const file = (overrides: Partial<FileView> = {}): FileView => ({
  path: "src/a.ts",
  absolutePath: "/p/src/a.ts",
  line: null,
  contents: "",
  size: 0,
  binary: false,
  truncated: false,
  ...overrides,
})

function setup(cwd = "/p") {
  const store = new EditorStore()
  const api = createMockInstance<API>(["getEditorUrl", "openEditorFile", "runEditorCommand", "setColorScheme"])
  vi.mocked(api.getEditorUrl).mockResolvedValue(URL_A)
  vi.mocked(api.openEditorFile).mockResolvedValue(true)
  vi.mocked(api.runEditorCommand).mockResolvedValue(undefined)
  vi.mocked(api.setColorScheme).mockResolvedValue(undefined)
  const themeStore = new ThemeStore()
  const metaStore = new MetaStore()
  metaStore.setMeta({ cwd } as AppMeta)
  const layoutStore = new LayoutStore()
  const loadFonts = vi.fn(async () => [{ family: "Monaspace Neon Var", weight: "100 800", data: new ArrayBuffer(4) }])
  const presenter = new EditorPresenter(store, api, themeStore, metaStore, layoutStore, window, loadFonts, nullLog())
  return { store, api, themeStore, metaStore, layoutStore, presenter, loadFonts }
}

function attachedFrame(presenter: EditorPresenter): HTMLIFrameElement {
  const frame = document.createElement("iframe")
  document.body.append(frame)
  presenter.attachFrame(frame)
  return frame
}

function announce(source: MessageEventSource | null, type = "slagent-ready") {
  window.dispatchEvent(new MessageEvent("message", { data: { type }, source }))
}

afterEach(() => {
  document.body.replaceChildren()
})

describe("EditorPresenter", () => {
  describe("openFile", () => {
    it("can switch to editor mode, start the server and open the file at its path", async () => {
      const { presenter, api, layoutStore, store } = setup()

      await presenter.openFile(file())

      expect(layoutStore.editorMode).toBe(true)
      expect(store.url).toBe(URL_A)
      expect(api.openEditorFile).toHaveBeenCalledWith("/p/src/a.ts")
    })

    it("can open the file on its line", async () => {
      const { presenter, api } = setup()

      await presenter.openFile(file({ line: 12 }))

      expect(api.openEditorFile).toHaveBeenCalledWith("/p/src/a.ts:12")
    })

    it("can start the server only once for several files", async () => {
      const { presenter, api } = setup()

      await presenter.openFile(file())
      await presenter.openFile(file({ absolutePath: "/p/b.ts" }))

      expect(api.getEditorUrl).toHaveBeenCalledTimes(1)
      expect(api.openEditorFile).toHaveBeenCalledTimes(2)
    })

    it("can share one start between the mode switch and the open", async () => {
      const { presenter, api } = setup()
      presenter.start()

      await presenter.openFile(file())

      expect(api.getEditorUrl).toHaveBeenCalledTimes(1)
      presenter.stop()
    })

    it("can skip opening when the server could not start", async () => {
      const { presenter, api, store } = setup()
      vi.mocked(api.getEditorUrl).mockRejectedValue(new Error("The editor server stopped."))

      await presenter.openFile(file())

      expect(store.status).toBe("failed")
      expect(store.error).toBe("The editor server stopped.")
      expect(api.openEditorFile).not.toHaveBeenCalled()
    })

    it("can survive a failed open", async () => {
      const { presenter, api, store } = setup()
      vi.mocked(api.openEditorFile).mockRejectedValue(new Error("refused"))

      await expect(presenter.openFile(file())).resolves.toBeUndefined()
      expect(store.status).not.toBe("failed")
    })
  })

  describe("start", () => {
    it("can leave the server alone while editor mode is off", () => {
      const { presenter, api } = setup()

      presenter.start()

      expect(api.getEditorUrl).not.toHaveBeenCalled()
      presenter.stop()
    })

    it("can start the server when editor mode opens", async () => {
      const { presenter, api, layoutStore, store } = setup()
      presenter.start()

      layoutStore.setEditorMode(true)
      await vi.waitFor(() => expect(store.url).toBe(URL_A))

      expect(api.getEditorUrl).toHaveBeenCalledTimes(1)
      presenter.stop()
    })

    it("can reload for another project", async () => {
      const { presenter, api, layoutStore, metaStore, store } = setup()
      layoutStore.setEditorMode(true)
      presenter.start()
      await vi.waitFor(() => expect(store.url).toBe(URL_A))
      vi.mocked(api.getEditorUrl).mockResolvedValue("http://127.0.0.1:4000/?tkn=abc&folder=%2Fother")

      metaStore.setMeta({ cwd: "/other" } as AppMeta)
      await vi.waitFor(() => expect(store.url).toContain("%2Fother"))

      presenter.stop()
    })

    it("can keep the page when editor mode closes so the frame is not rebuilt", async () => {
      const { presenter, api, layoutStore, store } = setup()
      layoutStore.setEditorMode(true)
      presenter.start()
      await vi.waitFor(() => expect(store.url).toBe(URL_A))

      layoutStore.setEditorMode(false)

      expect(store.url).toBe(URL_A)
      expect(api.getEditorUrl).toHaveBeenCalledTimes(1)
      presenter.stop()
    })
  })

  describe("frame messages", () => {
    it("can send the shape CSS once the frame is ready", async () => {
      const { presenter, store } = setup()
      presenter.start()
      await presenter.openFile(file())
      const frame = attachedFrame(presenter)
      const post = vi.spyOn(frame.contentWindow as Window, "postMessage")

      announce(frame.contentWindow)

      expect(post).toHaveBeenCalledWith(expect.objectContaining({ type: "slagent-css" }), "http://127.0.0.1:4000")
      expect(store.url).toBe(URL_A)
      presenter.stop()
    })

    it("can send the app's fonts to the frame as bytes", async () => {
      const { presenter, loadFonts } = setup()
      presenter.start()
      await presenter.openFile(file())
      const frame = attachedFrame(presenter)
      const post = vi.spyOn(frame.contentWindow as Window, "postMessage")

      announce(frame.contentWindow)
      await vi.waitFor(() => expect(post).toHaveBeenCalledWith(expect.objectContaining({ type: "slagent-font", family: "Monaspace Neon Var" }), "http://127.0.0.1:4000", expect.any(Array)))

      expect(loadFonts).toHaveBeenCalledTimes(1)
      presenter.stop()
    })

    it("can carry on when the fonts cannot be loaded", async () => {
      const { presenter, loadFonts } = setup()
      loadFonts.mockRejectedValue(new Error("offline"))
      presenter.start()
      await presenter.openFile(file())
      const frame = attachedFrame(presenter)
      const post = vi.spyOn(frame.contentWindow as Window, "postMessage")

      announce(frame.contentWindow)

      await vi.waitFor(() => expect(loadFonts).toHaveBeenCalled())
      expect(post).toHaveBeenCalledWith(expect.objectContaining({ type: "slagent-css" }), "http://127.0.0.1:4000")
      presenter.stop()
    })

    it("can ignore a message from another window", async () => {
      const { presenter, loadFonts } = setup()
      presenter.start()
      await presenter.openFile(file())
      attachedFrame(presenter)

      announce(window)

      expect(loadFonts).not.toHaveBeenCalled()
      presenter.stop()
    })

    it("can ignore a message that is not the ready signal", async () => {
      const { presenter, loadFonts } = setup()
      presenter.start()
      await presenter.openFile(file())
      const frame = attachedFrame(presenter)

      announce(frame.contentWindow, "something-else")

      expect(loadFonts).not.toHaveBeenCalled()
      presenter.stop()
    })

    it("can ignore messages after it stops", async () => {
      const { presenter, loadFonts } = setup()
      presenter.start()
      await presenter.openFile(file())
      const frame = attachedFrame(presenter)
      presenter.stop()

      announce(frame.contentWindow)

      expect(loadFonts).not.toHaveBeenCalled()
    })
  })

  describe("colour scheme", () => {
    it("can hand the app's theme choice to the window when it starts", () => {
      const { presenter, api, themeStore } = setup()
      themeStore.setPreference("dark")

      presenter.start()

      expect(api.setColorScheme).toHaveBeenCalledWith("dark")
      presenter.stop()
    })

    it("can follow the system by default", () => {
      const { presenter, api } = setup()

      presenter.start()

      expect(api.setColorScheme).toHaveBeenCalledWith("system")
      presenter.stop()
    })

    it("can pass on a change of the app's theme choice", () => {
      const { presenter, api, themeStore } = setup()
      presenter.start()

      themeStore.setPreference("light")

      expect(api.setColorScheme).toHaveBeenLastCalledWith("light")
      presenter.stop()
    })

    it("can carry on when the window refuses the scheme", () => {
      const { presenter, api, themeStore } = setup()
      vi.mocked(api.setColorScheme).mockRejectedValue(new Error("no"))
      presenter.start()

      expect(() => themeStore.setPreference("dark")).not.toThrow()
      presenter.stop()
    })
  })

  describe("handleFrameLoad", () => {
    it("can mark the editor ready", async () => {
      const { presenter, store } = setup()
      await presenter.openFile(file())

      presenter.handleFrameLoad()

      expect(store.status).toBe("ready")
    })
  })

  describe("runCommand", () => {
    it("can run a view command in the editor", async () => {
      const { presenter, api } = setup()

      await presenter.runCommand("workbench.view.search")

      expect(api.runEditorCommand).toHaveBeenCalledWith("workbench.view.search")
    })

    it("can survive a refused command", async () => {
      const { presenter, api } = setup()
      vi.mocked(api.runEditorCommand).mockRejectedValue(new Error("command not allowed"))

      await expect(presenter.runCommand("x")).resolves.toBeUndefined()
    })
  })

  describe("exit and retry", () => {
    it("can go back to the chat", () => {
      const { presenter, layoutStore } = setup()
      layoutStore.setEditorMode(true)

      presenter.exit()

      expect(layoutStore.editorMode).toBe(false)
    })

    it("can try the start again after a failure", async () => {
      const { presenter, api, store } = setup()
      vi.mocked(api.getEditorUrl).mockRejectedValueOnce(new Error("no")).mockResolvedValue(URL_A)
      await presenter.openFile(file())
      expect(store.status).toBe("failed")

      presenter.retry()
      await vi.waitFor(() => expect(store.url).toBe(URL_A))
    })
  })
})
