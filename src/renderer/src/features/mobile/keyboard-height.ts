// Drives the --kb-height custom property the mobile screens read while the
// keyboard is up: the webview resizes natively above the keyboard, and the
// home-indicator safe area must yield the same amount.
export function setKeyboardHeight(window: Window, height: number): void {
  window.document.documentElement.style.setProperty("--kb-height", `${Math.max(0, Math.round(height))}px`)
}
