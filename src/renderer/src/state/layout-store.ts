import { makeAutoObservable } from "mobx"

export type ResizeEdge = "sidebar" | "diff"

type EdgeSpec = {
  storageKey: string
  fallback: number
  min: number
  // Takes the window's inner width, so the widest a pane can get follows the window.
  max: (viewport: number) => number
  // 1 when dragging right grows the pane, -1 when dragging left does.
  direction: 1 | -1
}

export const LAYOUT_EDGES: Record<ResizeEdge, EdgeSpec> = {
  sidebar: {
    storageKey: "slagent:sidebar-width",
    fallback: 256,
    min: 200,
    max: (viewport) => Math.min(480, viewport * 0.4),
    direction: 1,
  },
  diff: {
    storageKey: "slagent:changes-width",
    fallback: 560,
    min: 320,
    max: (viewport) => viewport - 520,
    direction: -1,
  },
}

// Sidebar and right panel layout. Widths are the clamped values the panes render at.
export class LayoutStore {
  sidebarOpen = true
  sidebarWidth = LAYOUT_EDGES.sidebar.fallback
  diffWidth = LAYOUT_EDGES.diff.fallback
  // The pane being dragged. Its slot drops the width transition while it is set.
  resizing: ResizeEdge | null = null

  constructor() {
    makeAutoObservable(this)
  }

  setSidebarOpen(open: boolean) {
    this.sidebarOpen = open
  }

  setWidth(edge: ResizeEdge, px: number) {
    if (edge === "sidebar") {
      this.sidebarWidth = px
      return
    }
    this.diffWidth = px
  }

  setResizing(edge: ResizeEdge | null) {
    this.resizing = edge
  }
}
