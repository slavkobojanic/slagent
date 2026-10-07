// Shared look for Pierre's file and diff views.
import { getSharedHighlighter, isHighlighterLoaded } from "@pierre/diffs"

export const PIERRE_THEME = { dark: "github-dark-default", light: "github-light-default" } as const

// Pierre's styles live in its shadow root; this matches its background to the
// app's panels in either theme.
export const PIERRE_CSS = `
:host { --diffs-bg: var(--background); }
`

// Pierre's File view paints nothing until its shared Shiki highlighter has
// loaded, and its async repaint does not fire on its own, so the highlighter
// is warmed up here and FileViewer repaints once it is ready.
let preload: Promise<boolean> | null = null

export function preloadPierreHighlighter(): Promise<boolean> {
  preload ??= getSharedHighlighter({ themes: [PIERRE_THEME.dark, PIERRE_THEME.light], langs: [] })
    .then(() => true)
    .catch(() => false)
  return preload
}

export function pierreHighlighterReady(): boolean {
  return isHighlighterLoaded()
}
