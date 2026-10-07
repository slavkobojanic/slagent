import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import { looksLikePath } from "@/lib/format"
import type { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"

// A malformed percent-encoding is not a path, so the link is left alone.
function decodeHref(href: string): string | null {
  try {
    return decodeURIComponent(href)
  } catch {
    return null
  }
}

export class LinkPresenter {
  private attached = false

  constructor(
    private readonly window: Window,
    private readonly panel: PanelPresenter,
    private readonly api: API,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.attached) {
      return
    }
    this.attached = true
    this.window.document.addEventListener("click", this.handleClick)
  }

  stop = () => {
    if (!this.attached) {
      return
    }
    this.attached = false
    this.window.document.removeEventListener("click", this.handleClick)
  }

  private handleClick = (event: MouseEvent) => {
    const target = event.target
    if (!(target instanceof Element)) {
      return
    }
    const anchor = target.closest("a")
    if (anchor === null) {
      this.handleInlineCode(target)
      return
    }
    const href = anchor.getAttribute("href")
    if (!href) {
      return
    }
    if (href.startsWith("http://") || href.startsWith("https://")) {
      event.preventDefault()
      this.log.action("open-external", { href })
      void this.api.openExternal(href)
      return
    }
    const path = decodeHref(href)
    if (path === null || !looksLikePath(path)) {
      return
    }
    event.preventDefault()
    this.log.action("open-path", { path })
    void this.panel.openFile(path)
  }

  private handleInlineCode = (target: Element) => {
    const code = target.closest("code")
    if (code === null || code.closest("pre") !== null || code.closest(".chat-transcript") === null) {
      return
    }
    const text = code.textContent ?? ""
    if (!looksLikePath(text)) {
      return
    }
    this.log.action("open-inline-path", { path: text })
    void this.panel.openFile(text)
  }
}
