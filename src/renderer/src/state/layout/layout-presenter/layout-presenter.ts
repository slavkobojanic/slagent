import { LAYOUT_EDGES, type LayoutStore, type ResizeEdge } from "@/state/layout/layout-store/layout-store"

type PressEvent = Pick<PointerEvent, "button" | "clientX" | "preventDefault">

export class LayoutPresenter {
  private drag: { edge: ResizeEdge; detach: () => void } | null = null
  private started = false

  constructor(
    private readonly store: LayoutStore,
    private readonly window: Window,
  ) {}

  start = () => {
    if (this.started) {
      return
    }
    this.started = true
    this.restore("sidebar")
    this.restore("diff")
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
    this.store.setSidebarOpen(!this.store.sidebarOpen)
  }

  setSidebarOpen = (open: boolean) => {
    this.store.setSidebarOpen(open)
  }

  handleResizeStart = (edge: ResizeEdge, event: PressEvent) => {
    if (event.button !== 0) {
      return
    }
    event.preventDefault()
    this.endDrag()

    const target = this.window
    const startX = event.clientX
    const startWidth = edge === "sidebar" ? this.store.sidebarWidth : this.store.diffWidth
    const move = (next: PointerEvent) => {
      this.store.setWidth(edge, this.clamp(edge, startWidth + (next.clientX - startX) * LAYOUT_EDGES[edge].direction))
    }
    target.addEventListener("pointermove", move)
    target.addEventListener("pointerup", this.endDrag)
    target.addEventListener("pointercancel", this.endDrag)
    target.document.body.classList.add("resizing")
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
    this.store.setWidth(edge, this.clamp(edge, LAYOUT_EDGES[edge].fallback))
    try {
      this.window.localStorage.removeItem(LAYOUT_EDGES[edge].storageKey)
    } catch {
      // Width is a convenience; storage may be unavailable.
    }
  }

  endDrag = () => {
    if (this.drag === null) {
      return
    }
    const { edge, detach } = this.drag
    detach()
    this.drag = null
    this.window.document.body.classList.remove("resizing")
    this.store.setResizing(null)
    this.persist(edge)
  }

  private restore = (edge: ResizeEdge) => {
    this.store.setWidth(edge, this.clamp(edge, this.readStored(edge)))
  }

  private readStored = (edge: ResizeEdge): number => {
    const spec = LAYOUT_EDGES[edge]
    try {
      const value = Number(this.window.localStorage.getItem(spec.storageKey))
      if (Number.isFinite(value) && value > 0) {
        return value
      }
    } catch {
      // Width is a convenience; storage may be unavailable.
    }
    return spec.fallback
  }

  private persist = (edge: ResizeEdge) => {
    const width = edge === "sidebar" ? this.store.sidebarWidth : this.store.diffWidth
    try {
      this.window.localStorage.setItem(LAYOUT_EDGES[edge].storageKey, String(width))
    } catch {
      // Not persisted, but the width still applies for this session.
    }
  }

  private clamp = (edge: ResizeEdge, value: number): number => {
    const spec = LAYOUT_EDGES[edge]
    const max = spec.max(this.window.innerWidth)
    return Math.round(Math.min(Math.max(value, spec.min), Math.max(spec.min, max)))
  }

  // The bounds depend on the window, so a shrinking window pulls an over-wide pane back in.
  private handleViewportResize = () => {
    this.store.setWidth("sidebar", this.clamp("sidebar", this.store.sidebarWidth))
    this.store.setWidth("diff", this.clamp("diff", this.store.diffWidth))
  }
}
