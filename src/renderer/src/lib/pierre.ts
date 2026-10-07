// Shared look for Pierre's file and diff views.
export const PIERRE_THEME = { dark: "github-dark-default", light: "github-light-default" } as const

// Pierre's styles live in its shadow root; this matches its background to the
// app's panels in either theme.
export const PIERRE_CSS = `
:host { --diffs-bg: var(--background); }
`
