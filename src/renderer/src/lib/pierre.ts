import { getSharedHighlighter } from "@pierre/diffs"

export const PIERRE_THEME = { dark: "github-dark-default", light: "github-light-default" } as const

// Pierre's styles live in its shadow root, so its background is set from inside it.
// Its own font variables fall back to hardcoded stacks, so both the diff body and
// its header inherit the app's mono/sans fonts through the shadow boundary.
export const PIERRE_CSS = `
:host { --diffs-bg: var(--background); --diffs-font-family: var(--font-mono); --diffs-header-font-family: var(--font-sans); }
`

// The mobile diff list draws its own file header (path and counts), so Pierre's
// built-in header would show the filename a second time.
export const PIERRE_CSS_NO_HEADER = `${PIERRE_CSS}\n[data-diffs-header] { display: none !important; }`

// Pierre's File view paints nothing until its shared Shiki highlighter has loaded. Pierre
// keeps one highlighter, so main warms it at boot and the file viewer waits on this call.
export function preloadPierreHighlighter(): Promise<boolean> {
  return getSharedHighlighter({ themes: [PIERRE_THEME.dark, PIERRE_THEME.light], langs: [] })
    .then(() => true)
    .catch(() => false)
}
