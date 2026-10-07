import { makeAutoObservable } from "mobx"

export type ResizeEdge = "sidebar" | "diff"

type EdgeSpec = {
  storageKey: string
  fallback: number
  min: number
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

export class LayoutStore {
  sidebarOpen = true
  sidebarWidth = LAYOUT_EDGES.sidebar.fallback
  diffWidth = LAYOUT_EDGES.diff.fallback
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
