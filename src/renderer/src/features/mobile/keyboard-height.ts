// Drives the --kb-height custom property the mobile screens read while the
// keyboard is up: the webview stays full height behind the keyboard, so the
// screens pad themselves by this much to keep the composer above it.
export function setKeyboardHeight(window: Window, height: number): void {
  window.document.documentElement.style.setProperty("--kb-height", `${Math.max(0, Math.round(height))}px`)
}
