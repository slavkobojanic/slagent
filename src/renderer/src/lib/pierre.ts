import { getSharedHighlighter } from "@pierre/diffs"

export const PIERRE_THEME = { dark: "github-dark-default", light: "github-light-default" } as const

// Pierre's styles live in its shadow root, so its background is set from inside it.
export const PIERRE_CSS = `
:host { --diffs-bg: var(--background); }
`

// Pierre's File view paints nothing until its shared Shiki highlighter has loaded. Pierre
// keeps one highlighter, so main warms it at boot and the file viewer waits on this call.
export function preloadPierreHighlighter(): Promise<boolean> {
  return getSharedHighlighter({ themes: [PIERRE_THEME.dark, PIERRE_THEME.light], langs: [] })
    .then(() => true)
    .catch(() => false)
}
