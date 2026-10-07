import type { AppEnv } from "@/state/app-deps"
import { LAYOUT_EDGES, type LayoutStore, type ResizeEdge } from "@/state/layout-store"

// The parts of a pointerdown the drag needs. A React or DOM pointer event satisfies it.
type PressEvent = Pick<PointerEvent, "button" | "clientX" | "preventDefault">

// Pane resizing. The width follows the pointer, clamped to the pane's bounds, and is
// remembered across launches. Pointer listeners exist only while a drag runs.
export class LayoutPresenter {
  private drag: { edge: ResizeEdge; detach: () => void } | null = null
  private started = false

  constructor(
    private readonly store: LayoutStore,
    private readonly env: AppEnv,
  ) {}

  start = () => {
    if (this.started) {
      return
    }
    this.started = true
    this.restore("sidebar")
    this.restore("diff")
    this.env.window.addEventListener("resize", this.handleViewportResize)
  }

  stop = () => {
    if (!this.started) {
      return
    }
    this.endDrag()
    this.env.window.removeEventListener("resize", this.handleViewportResize)
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

    const target = this.env.window
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

  // A double-click on the handle puts the pane back at its default width.
  handleResizeReset = (edge: ResizeEdge) => {
    this.store.setWidth(edge, this.clamp(edge, LAYOUT_EDGES[edge].fallback))
    try {
      this.env.window.localStorage.removeItem(LAYOUT_EDGES[edge].storageKey)
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
    this.env.window.document.body.classList.remove("resizing")
    this.store.setResizing(null)
    this.persist(edge)
  }

  private restore = (edge: ResizeEdge) => {
    this.store.setWidth(edge, this.clamp(edge, this.readStored(edge)))
  }

  private readStored = (edge: ResizeEdge): number => {
    const spec = LAYOUT_EDGES[edge]
    try {
      const value = Number(this.env.window.localStorage.getItem(spec.storageKey))
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
      this.env.window.localStorage.setItem(LAYOUT_EDGES[edge].storageKey, String(width))
    } catch {
      // Not persisted, but the width still applies for this session.
    }
  }

  private clamp = (edge: ResizeEdge, value: number): number => {
    const spec = LAYOUT_EDGES[edge]
    const max = spec.max(this.env.window.innerWidth)
    return Math.round(Math.min(Math.max(value, spec.min), Math.max(spec.min, max)))
  }

  // The bounds depend on the window, so a shrinking window pulls an over-wide pane back in.
  private handleViewportResize = () => {
    this.store.setWidth("sidebar", this.clamp("sidebar", this.store.sidebarWidth))
    this.store.setWidth("diff", this.clamp("diff", this.store.diffWidth))
  }
}
