// Drives the --kb-height custom property the mobile screens read while the
// keyboard is up: the webview stays full height behind the keyboard, and the
// screen rides it with a transform sized by this (mobile-keyboard-shift).
export function setKeyboardHeight(window: Window, height: number): void {
  window.document.documentElement.style.setProperty("--kb-height", `${Math.max(0, Math.round(height))}px`)
}
