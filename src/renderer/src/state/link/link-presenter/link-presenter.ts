import { toast } from "sonner"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import { errorText, looksLikePath } from "@/lib/format"
import type { LinkPreference, LinkStore } from "@/state/link/link-store/link-store"
import type { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"

const STORAGE_KEY = "slagent-link"

// Rough size of the menu, used to keep it inside the viewport.
const MENU_WIDTH = 232
const MENU_HEIGHT = 220

// A malformed percent-encoding is not a path, so the link is left alone.
function decodeHref(href: string): string | null {
  try {
    return decodeURIComponent(href)
  } catch {
    return null
  }
}

function webHrefOf(event: MouseEvent): string | null {
  const target = event.target
  if (!(target instanceof Element)) {
    return null
  }
  const href = target.closest("a")?.getAttribute("href") ?? null
  if (href === null || (!href.startsWith("http://") && !href.startsWith("https://"))) {
    return null
  }
  return href
}

export class LinkPresenter {
  private attached = false

  constructor(
    private readonly store: LinkStore,
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
    this.store.setPreference(this.readPreference())
    this.window.document.addEventListener("click", this.handleClick)
    this.window.document.addEventListener("contextmenu", this.handleContextMenu)
    this.window.document.addEventListener("pointerdown", this.handlePointerDown)
    this.window.document.addEventListener("keydown", this.handleKeyDown)
  }

  stop = () => {
    if (!this.attached) {
      return
    }
    this.attached = false
    this.window.document.removeEventListener("click", this.handleClick)
    this.window.document.removeEventListener("contextmenu", this.handleContextMenu)
    this.window.document.removeEventListener("pointerdown", this.handlePointerDown)
    this.window.document.removeEventListener("keydown", this.handleKeyDown)
  }

  handleOpen = (url: string) => {
    this.handleClose()
    this.openWebLink(url)
  }

  handleCopy = (url: string) => {
    this.handleClose()
    void this.copyLink(url)
  }

  handleAlwaysOpen = (url: string) => {
    this.remember("browser")
    this.handleOpen(url)
  }

  handleAlwaysCopy = (url: string) => {
    this.remember("copy")
    this.handleCopy(url)
  }

  handleAskEveryTime = () => {
    this.remember(null)
    this.handleClose()
  }

  handleClose = () => {
    this.store.closeMenu()
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
      this.resolveWebLink(href, event)
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

  // Right-click offers the choice even when a decision is remembered.
  private handleContextMenu = (event: MouseEvent) => {
    const href = webHrefOf(event)
    if (href === null) {
      return
    }
    event.preventDefault()
    this.openMenu(href, event)
  }

  // A pointerdown outside the menu dismisses it. Runs before the click that
  // follows, so the click never lands on the link underneath.
  private handlePointerDown = (event: PointerEvent) => {
    if (this.store.menu === null) {
      return
    }
    const target = event.target
    if (target instanceof Element && target.closest("[data-link-menu]") !== null) {
      return
    }
    this.handleClose()
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (this.store.menu !== null && event.key === "Escape") {
      this.handleClose()
    }
  }

  private resolveWebLink(href: string, event: MouseEvent) {
    const preference = this.store.preference
    if (preference === "browser") {
      this.openWebLink(href)
      return
    }
    if (preference === "copy") {
      void this.copyLink(href)
      return
    }
    this.openMenu(href, event)
  }

  private openWebLink(url: string) {
    this.log.action("open-external", { url })
    void this.api.openExternal(url)
  }

  private async copyLink(url: string) {
    this.log.action("copy-link", { url })
    try {
      await this.window.navigator.clipboard.writeText(url)
      toast.success("Copied")
    } catch (error) {
      this.log.warn("copy-link-failed", { url, error })
      toast.error(errorText(error))
    }
  }

  private openMenu(url: string, event: MouseEvent) {
    this.log.action("open-link-menu", { url })
    const x = Math.min(event.clientX, this.window.innerWidth - MENU_WIDTH)
    const y = Math.min(event.clientY, this.window.innerHeight - MENU_HEIGHT)
    this.store.openMenu({ url, x: Math.max(0, x), y: Math.max(0, y) })
  }

  private remember(preference: LinkPreference | null) {
    this.log.action("remember-link-preference", { preference })
    this.store.setPreference(preference)
    try {
      if (preference === null) {
        this.window.localStorage.removeItem(STORAGE_KEY)
      } else {
        this.window.localStorage.setItem(STORAGE_KEY, preference)
      }
    } catch {
      // Not persisted, but still applied for this session.
    }
  }

  private readPreference = (): LinkPreference | null => {
    try {
      const value = this.window.localStorage.getItem(STORAGE_KEY)
      if (value === "browser" || value === "copy") {
        return value
      }
    } catch {
      // Storage can be unavailable; fall through to the default.
    }
    return null
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