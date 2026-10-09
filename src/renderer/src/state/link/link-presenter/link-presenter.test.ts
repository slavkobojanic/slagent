import { toast } from "sonner"
import type { API } from "@/ipc/api"
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest"
import { LinkPresenter } from "@/state/link/link-presenter/link-presenter"
import { LinkStore } from "@/state/link/link-store/link-store"
import { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import { PanelStore } from "@/state/panel/panel-store/panel-store"
import { createMockInstance } from "@/test/create-mock-instance"
import type { FileView } from "@shared/types"
import { nullLog } from "@/log/log"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const file: FileView = {
  path: "src/app.ts",
  absolutePath: "/work/src/app.ts",
  line: null,
  contents: "",
  size: 0,
  binary: false,
  truncated: false,
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

function element(selector: string): Element {
  const found = document.querySelector(selector)
  if (found === null) {
    throw new Error(`no element matches ${selector}`)
  }
  return found
}

function clickOn(target: Element) {
  const event = new MouseEvent("click", { bubbles: true, cancelable: true })
  target.dispatchEvent(event)
  return event
}

function rightClickOn(target: Element) {
  const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true })
  target.dispatchEvent(event)
  return event
}

function pointerDownOn(target: Element) {
  const event = new MouseEvent("pointerdown", { bubbles: true, cancelable: true })
  target.dispatchEvent(event)
  return event
}

describe("LinkPresenter", () => {
  let readFile: Mock
  let openExternal: Mock
  let panel: PanelStore
  let store: LinkStore
  let writeText: Mock
  let presenter: LinkPresenter

  beforeEach(() => {
    document.body.innerHTML = ""
    window.localStorage.clear()
    const api = createMockInstance<API>(["readFile", "openExternal"])
    readFile = api.readFile
    openExternal = api.openExternal
    panel = new PanelStore()
    store = new LinkStore()
    presenter = new LinkPresenter(store, window, new PanelPresenter(panel, api, nullLog()), api, nullLog())
    presenter.start()
  })

  afterEach(() => {
    presenter.stop()
    document.body.innerHTML = ""
    Reflect.deleteProperty(window.navigator, "clipboard")
  })

  function stubClipboard() {
    writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(window.navigator, "clipboard", { configurable: true, value: { writeText } })
  }

  describe("click", () => {
    it("can open a file path in a link in the right panel", async () => {
      readFile.mockResolvedValue(file)
      document.body.innerHTML = '<a href="src/app.ts">app</a>'

      clickOn(element("a"))
      await flush()

      expect(readFile).toHaveBeenCalledWith("src/app.ts")
      expect(panel.viewedFile).toEqual(file)
      expect(panel.tab).toBe("file")
    })

    it("asks how to open a web link when no decision is remembered", () => {
      document.body.innerHTML = '<a href="https://example.com/docs">docs</a>'

      const event = clickOn(element("a"))

      expect(openExternal).not.toHaveBeenCalled()
      expect(event.defaultPrevented).toBe(true)
      expect(store.menu).toEqual({ url: "https://example.com/docs", x: 0, y: 0 })
    })

    it("opens a web link in the browser when that decision is remembered", () => {
      store.setPreference("browser")
      document.body.innerHTML = '<a href="https://example.com/docs">docs</a>'

      clickOn(element("a"))

      expect(openExternal).toHaveBeenCalledWith("https://example.com/docs")
      expect(store.menu).toBeNull()
    })

    it("copies a web link with a toast when that decision is remembered", async () => {
      stubClipboard()
      store.setPreference("copy")
      document.body.innerHTML = '<a href="https://example.com/docs">docs</a>'

      clickOn(element("a"))
      await flush()

      expect(writeText).toHaveBeenCalledWith("https://example.com/docs")
      expect(toast.success).toHaveBeenCalledWith("Copied")
      expect(store.menu).toBeNull()
    })

    it("can leave a link that is neither a path nor a web address alone", () => {
      document.body.innerHTML = '<a href="#top">top</a>'

      const event = clickOn(element("a"))

      expect(openExternal).not.toHaveBeenCalled()
      expect(event.defaultPrevented).toBe(false)
      expect(store.menu).toBeNull()
    })
  })

  describe("contextmenu", () => {
    it("offers the choice even when a decision is remembered", () => {
      store.setPreference("browser")
      document.body.innerHTML = '<a href="https://example.com/docs">docs</a>'

      const event = rightClickOn(element("a"))

      expect(openExternal).not.toHaveBeenCalled()
      expect(event.defaultPrevented).toBe(true)
      expect(store.menu).toEqual({ url: "https://example.com/docs", x: 0, y: 0 })
    })

    it("ignores a right-click on anything but a web link", () => {
      document.body.innerHTML = '<a href="src/app.ts">app</a>'

      rightClickOn(element("a"))

      expect(store.menu).toBeNull()
    })
  })

  describe("menu handlers", () => {
    const url = "https://example.com/docs"

    beforeEach(() => {
      store.openMenu({ url, x: 10, y: 10 })
    })

    it("can open the link and close the menu", () => {
      presenter.handleOpen(url, false)

      expect(openExternal).toHaveBeenCalledWith(url)
      expect(store.menu).toBeNull()
      expect(store.preference).toBeNull()
    })

    it("can copy the link, toast and close the menu", async () => {
      stubClipboard()

      presenter.handleCopy(url, false)
      await flush()

      expect(store.preference).toBeNull()

      expect(writeText).toHaveBeenCalledWith(url)
      expect(toast.success).toHaveBeenCalledWith("Copied")
      expect(store.menu).toBeNull()
    })

    it("can toast a copy failure", async () => {
      stubClipboard()
      writeText.mockRejectedValue(new Error("denied"))

      presenter.handleCopy(url, false)
      await flush()

      expect(toast.error).toHaveBeenCalledWith("denied")
    })

    it("can remember opening in the browser", () => {
      presenter.handleOpen(url, true)

      expect(store.preference).toBe("browser")
      expect(window.localStorage.getItem("slagent-link")).toBe("browser")
      expect(openExternal).toHaveBeenCalledWith(url)
      expect(store.menu).toBeNull()
    })

    it("can remember copying", async () => {
      stubClipboard()

      presenter.handleCopy(url, true)
      await flush()

      expect(store.preference).toBe("copy")
      expect(window.localStorage.getItem("slagent-link")).toBe("copy")
      expect(writeText).toHaveBeenCalledWith(url)
    })

    it("can change the remembered decision from settings", () => {
      presenter.setPreference("copy")

      expect(store.preference).toBe("copy")
      expect(window.localStorage.getItem("slagent-link")).toBe("copy")
    })

    it("can go back to asking every time", () => {
      store.setPreference("copy")
      window.localStorage.setItem("slagent-link", "copy")

      presenter.handleAskEveryTime()

      expect(store.preference).toBeNull()
      expect(window.localStorage.getItem("slagent-link")).toBeNull()
      expect(store.menu).toBeNull()
    })
  })

  describe("dismissal", () => {
    beforeEach(() => {
      document.body.innerHTML = '<div data-link-menu><button type="button">Open</button></div><p>elsewhere</p>'
      store.openMenu({ url: "https://example.com/docs", x: 10, y: 10 })
    })

    it("closes on a pointerdown outside the menu", () => {
      pointerDownOn(element("p"))

      expect(store.menu).toBeNull()
    })

    it("stays open on a pointerdown inside the menu", () => {
      pointerDownOn(element("button"))

      expect(store.menu).not.toBeNull()
    })

    it("closes on Escape", () => {
      const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      document.body.dispatchEvent(event)

      expect(store.menu).toBeNull()
    })
  })

  describe("remembered decision", () => {
    it("is read back from storage on start", () => {
      window.localStorage.setItem("slagent-link", "copy")
      const restarted = new LinkPresenter(store, window, new PanelPresenter(panel, createMockInstance<API>([]), nullLog()), createMockInstance<API>([]), nullLog())

      restarted.start()
      restarted.stop()

      expect(store.preference).toBe("copy")
    })

    it("ignores an unknown stored value", () => {
      window.localStorage.setItem("slagent-link", "nope")
      const restarted = new LinkPresenter(store, window, new PanelPresenter(panel, createMockInstance<API>([]), nullLog()), createMockInstance<API>([]), nullLog())

      restarted.start()
      restarted.stop()

      expect(store.preference).toBeNull()
    })
  })
})