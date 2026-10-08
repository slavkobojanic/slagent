import { makeAutoObservable } from "mobx"

export type ResizeEdge = "sidebar" | "diff" | "terminal"

type EdgeSpec = {
  storageKey: string
  fallback: number
  min: number
  // The bound grows with the window along the axis the edge resizes.
  max: (viewport: number) => number
  // 1 when dragging right (or down) grows the pane, -1 when dragging left (or up) does.
  direction: 1 | -1
  axis: "x" | "y"
}

export const LAYOUT_EDGES: Record<ResizeEdge, EdgeSpec> = {
  sidebar: {
    storageKey: "slagent:sidebar-width",
    fallback: 256,
    min: 200,
    max: (viewport) => Math.min(480, viewport * 0.4),
    direction: 1,
    axis: "x",
  },
  diff: {
    storageKey: "slagent:changes-width",
    fallback: 560,
    min: 320,
    max: (viewport) => viewport - 520,
    direction: -1,
    axis: "x",
  },
  terminal: {
    storageKey: "slagent:terminal-height",
    fallback: 288,
    min: 120,
    // The composer and the transcript need room above the drawer.
    max: (viewport) => viewport - 240,
    direction: -1,
    axis: "y",
  },
}

export class LayoutStore {
  sidebarOpen = true
  sidebarWidth = LAYOUT_EDGES.sidebar.fallback
  diffWidth = LAYOUT_EDGES.diff.fallback
  terminalHeight = LAYOUT_EDGES.terminal.fallback
  resizing: ResizeEdge | null = null

  constructor() {
    makeAutoObservable(this)
  }

  setSidebarOpen(open: boolean) {
    this.sidebarOpen = open
  }

  sizeOf(edge: ResizeEdge): number {
    if (edge === "sidebar") {
      return this.sidebarWidth
    }
    if (edge === "diff") {
      return this.diffWidth
    }
    return this.terminalHeight
  }

  setSize(edge: ResizeEdge, px: number) {
    if (edge === "sidebar") {
      this.sidebarWidth = px
      return
    }
    if (edge === "diff") {
      this.diffWidth = px
      return
    }
    this.terminalHeight = px
  }

  setResizing(edge: ResizeEdge | null) {
    this.resizing = edge
  }
}
