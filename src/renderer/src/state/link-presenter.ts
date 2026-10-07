import type { AppService } from "@/ipc/app-service/app-service"
import { looksLikePath } from "@/lib/format"
import type { AppEnv } from "@/state/app-deps"
import type { PanelPresenter } from "@/state/panel-presenter"

// A link's href is percent-encoded. A malformed encoding is not a path, so the link is left alone.
function decodeHref(href: string): string | null {
  try {
    return decodeURIComponent(href)
  } catch {
    return null
  }
}

// Document-wide link handling. A file path in a link or in inline code opens in the right
// panel. An external link opens in the browser. Other links are left to the page.
export class LinkPresenter {
  private attached = false

  constructor(
    private readonly env: AppEnv,
    private readonly panel: Pick<PanelPresenter, "openFile" | "showFile">,
    private readonly app: Pick<AppService, "openExternal">,
  ) {}

  start = () => {
    if (this.attached) {
      return
    }
    this.attached = true
    this.env.window.document.addEventListener("click", this.handleClick)
  }

  stop = () => {
    if (!this.attached) {
      return
    }
    this.attached = false
    this.env.window.document.removeEventListener("click", this.handleClick)
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
      void this.app.openExternal(href)
      return
    }
    const path = decodeHref(href)
    if (path === null || !looksLikePath(path)) {
      return
    }
    event.preventDefault()
    void this.panel.openFile(path)
  }

  // Inline code in a chat that looks like a path opens the file. Code blocks do not.
  private handleInlineCode = (target: Element) => {
    const code = target.closest("code")
    if (code === null || code.closest("pre") !== null || code.closest(".chat-transcript") === null) {
      return
    }
    const text = code.textContent ?? ""
    if (!looksLikePath(text)) {
      return
    }
    void this.panel.openFile(text)
  }
}
