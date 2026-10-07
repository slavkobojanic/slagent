import { afterEach, beforeEach, describe, expect, it, type Mock } from "vitest"
import type { AppService } from "@/ipc/app-service/app-service"
import type { FileService } from "@/ipc/file-service/file-service"
import { LinkPresenter } from "@/state/link-presenter"
import { PanelPresenter } from "@/state/panel-presenter"
import { PanelStore } from "@/state/panel-store"
import { createMockInstance } from "@/test/create-mock-instance"
import type { FileView } from "@shared/types"

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

describe("LinkPresenter", () => {
  let readFile: Mock
  let openExternal: Mock
  let panel: PanelStore
  let presenter: LinkPresenter

  beforeEach(() => {
    document.body.innerHTML = ""
    readFile = createMockInstance<FileService>(["readFile"]).readFile
    openExternal = createMockInstance<AppService>(["openExternal"]).openExternal
    panel = new PanelStore()
    const files = { readFile }
    const app = { openExternal }
    presenter = new LinkPresenter({ window }, new PanelPresenter(panel, files), app)
    presenter.start()
  })

  afterEach(() => {
    presenter.stop()
    document.body.innerHTML = ""
  })

  describe("click", () => {
    it("can open a file path in a link in the right panel", async () => {
      readFile.mockResolvedValue(file)
      document.body.innerHTML = '<a href="src/app.ts">app</a>'

      clickOn(element("a"))
      await flush()

      expect(readFile).toHaveBeenCalledWith("src/app.ts")
      expect(panel.viewedFile).toBe(file)
      expect(panel.tab).toBe("file")
    })

    it("can open an external link in the browser instead of navigating", () => {
      document.body.innerHTML = '<a href="https://example.com/docs">docs</a>'

      const event = clickOn(element("a"))

      expect(openExternal).toHaveBeenCalledWith("https://example.com/docs")
      expect(event.defaultPrevented).toBe(true)
    })

    it("can leave a link that is neither a path nor a web address alone", () => {
      document.body.innerHTML = '<a href="#top">top</a>'

      const event = clickOn(element("a"))

      expect(openExternal).not.toHaveBeenCalled()
      expect(readFile).not.toHaveBeenCalled()
      expect(event.defaultPrevented).toBe(false)
    })

    it("can open a path in inline code inside the chat", async () => {
      readFile.mockResolvedValue(file)
      document.body.innerHTML = '<div class="chat-transcript"><code>src/app.ts</code></div>'

      clickOn(element("code"))
      await flush()

      expect(readFile).toHaveBeenCalledWith("src/app.ts")
    })

    it("can leave a path in a code block alone", async () => {
      document.body.innerHTML = '<div class="chat-transcript"><pre><code>src/app.ts</code></pre></div>'

      clickOn(element("code"))
      await flush()

      expect(readFile).not.toHaveBeenCalled()
    })

    it("can leave inline code outside the chat transcript alone", async () => {
      document.body.innerHTML = "<p><code>src/app.ts</code></p>"

      clickOn(element("code"))
      await flush()

      expect(readFile).not.toHaveBeenCalled()
    })

    it("can leave a link with a malformed encoding alone instead of throwing", () => {
      document.body.innerHTML = '<a href="src/%E0%A4%A.ts">broken</a>'
      // Added after the presenter's listener, so it sees whether the presenter prevented the click.
      // It then cancels the navigation jsdom would otherwise attempt.
      let prevented = true
      const observe = (event: Event) => {
        prevented = event.defaultPrevented
        event.preventDefault()
      }
      document.addEventListener("click", observe)

      clickOn(element("a"))
      document.removeEventListener("click", observe)

      expect(readFile).not.toHaveBeenCalled()
      expect(prevented).toBe(false)
    })
  })

  describe("stop", () => {
    it("can stop handling clicks once stopped", () => {
      readFile.mockResolvedValue(file)
      document.body.innerHTML = '<div class="chat-transcript"><code>src/app.ts</code></div>'
      presenter.stop()

      clickOn(element("code"))

      expect(readFile).not.toHaveBeenCalled()
    })
  })
})
