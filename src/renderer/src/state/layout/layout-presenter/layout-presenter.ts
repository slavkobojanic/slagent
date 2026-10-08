import type { Log } from "@/log/log"
import { LAYOUT_EDGES, type LayoutStore, type ResizeEdge } from "@/state/layout/layout-store/layout-store"

type PressEvent = Pick<PointerEvent, "button" | "clientX" | "clientY" | "preventDefault">

export class LayoutPresenter {
  private drag: { edge: ResizeEdge; detach: () => void } | null = null
  private started = false

  constructor(
    private readonly store: LayoutStore,
    private readonly window: Window,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.started) {
      return
    }
    this.started = true
    this.restore("sidebar")
    this.restore("diff")
    this.restore("terminal")
    this.window.addEventListener("resize", this.handleViewportResize)
  }

  stop = () => {
    if (!this.started) {
      return
    }
    this.endDrag()
    this.window.removeEventListener("resize", this.handleViewportResize)
    this.started = false
  }

  toggleSidebar = () => {
    this.log.action("toggle-sidebar", { open: !this.store.sidebarOpen })
    this.store.setSidebarOpen(!this.store.sidebarOpen)
  }

  setSidebarOpen = (open: boolean) => {
    this.log.action("set-sidebar-open", { open })
    this.store.setSidebarOpen(open)
  }

  handleResizeStart = (edge: ResizeEdge, event: PressEvent) => {
    if (event.button !== 0) {
      return
    }
    event.preventDefault()
    this.endDrag()

    const spec = LAYOUT_EDGES[edge]
    const target = this.window
    const startPosition = this.positionOf(edge, event)
    const startSize = this.store.sizeOf(edge)
    const move = (next: PointerEvent) => {
      this.store.setSize(edge, this.clamp(edge, startSize + (this.positionOf(edge, next) - startPosition) * spec.direction))
    }
    target.addEventListener("pointermove", move)
    target.addEventListener("pointerup", this.endDrag)
    target.addEventListener("pointercancel", this.endDrag)
    target.document.body.classList.add(spec.axis === "y" ? "resizing-row" : "resizing")
    this.store.setResizing(edge)
    this.drag = {
      edge,
      detach: () => {
        target.removeEventListener("pointermove", move)
        target.removeEventListener("pointerup", this.endDrag)
        target.removeEventListener("pointercancel", this.endDrag)
      },
    }
  }

  handleResizeReset = (edge: ResizeEdge) => {
    this.log.action("reset-size", { edge })
    this.store.setSize(edge, this.clamp(edge, LAYOUT_EDGES[edge].fallback))
    try {
      this.window.localStorage.removeItem(LAYOUT_EDGES[edge].storageKey)
    } catch {
      // Size is a convenience; storage may be unavailable.
    }
  }

  endDrag = () => {
    if (this.drag === null) {
      return
    }
    const { edge, detach } = this.drag
    detach()
    this.drag = null
    this.window.document.body.classList.remove("resizing", "resizing-row")
    this.store.setResizing(null)
    this.persist(edge)
    this.log.action("resize", { edge, size: this.store.sizeOf(edge) })
  }

  private restore = (edge: ResizeEdge) => {
    this.store.setSize(edge, this.clamp(edge, this.readStored(edge)))
  }

  private readStored = (edge: ResizeEdge): number => {
    const spec = LAYOUT_EDGES[edge]
    try {
      const value = Number(this.window.localStorage.getItem(spec.storageKey))
      if (Number.isFinite(value) && value > 0) {
        return value
      }
    } catch {
      // Size is a convenience; storage may be unavailable.
    }
    return spec.fallback
  }

  private persist = (edge: ResizeEdge) => {
    try {
      this.window.localStorage.setItem(LAYOUT_EDGES[edge].storageKey, String(this.store.sizeOf(edge)))
    } catch {
      // Not persisted, but the size still applies for this session.
    }
  }

  private clamp = (edge: ResizeEdge, value: number): number => {
    const spec = LAYOUT_EDGES[edge]
    const max = spec.max(this.viewportOf(edge))
    return Math.round(Math.min(Math.max(value, spec.min), Math.max(spec.min, max)))
  }

  private positionOf = (edge: ResizeEdge, event: Pick<PointerEvent, "clientX" | "clientY">): number => {
    if (LAYOUT_EDGES[edge].axis === "y") {
      return event.clientY
    }
    return event.clientX
  }

  private viewportOf = (edge: ResizeEdge): number => {
    if (LAYOUT_EDGES[edge].axis === "y") {
      return this.window.innerHeight
    }
    return this.window.innerWidth
  }

  // The bounds depend on the window, so a shrinking window pulls an over-wide pane back in.
  private handleViewportResize = () => {
    this.store.setSize("sidebar", this.clamp("sidebar", this.store.sidebarWidth))
    this.store.setSize("diff", this.clamp("diff", this.store.diffWidth))
    this.store.setSize("terminal", this.clamp("terminal", this.store.terminalHeight))
  }
}
