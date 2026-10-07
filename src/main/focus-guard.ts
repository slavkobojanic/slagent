import { type ExtensionFactory, isToolCallEventType } from "@earendil-works/pi-coding-agent"

// Background computer use must never take the user's focus. Bash is the escape
// hatch models reach for when the computer_* tools feel slow, so it is policed
// here instead of trusting the prompt.

const OPEN_COMMAND = /(^|[;&|(\n]\s*|\bthen\s+|\bdo\s+)open(?=\s)(?![^;&|\n]*\s-[a-zA-Z]*g)/g
const FOCUS_SCRIPT = /\b(activate|reopen|System Events|keystroke|key code|AXRaise|set frontmost)\b/i

export function backgroundOpen(command: string): string {
  return command.replace(OPEN_COMMAND, "$1open -g")
}

const OPEN_APP_OR_URL = /(^|[;&|(\n]\s*|\bthen\s+|\bdo\s+)open(?=\s)[^;&|\n]*(\s-[a-zA-Z]*[ab]\b|\b[a-z][a-z0-9+.-]*:\/\/|\.app\b)/

export function focusStealReason(command: string): string | null {
  if (OPEN_APP_OR_URL.test(command)) {
    return "Blocked: opening apps or URLs from the shell can bring them to the front, even with -g, because apps often activate themselves on launch. Use computer_open with app and url instead. It opens them in the background and reverts self-activation."
  }
  if (/\bosascript\b/.test(command) && FOCUS_SCRIPT.test(command)) {
    return "Blocked: this osascript would bring an app to the front or send keystrokes through System Events, which interrupts the user. Use the computer_* tools instead. They work on background windows over the Accessibility API."
  }
  return null
}

export const focusGuard: ExtensionFactory = (pi) => {
  pi.on("tool_call", (event) => {
    if (!isToolCallEventType("bash", event)) return
    const reason = focusStealReason(event.input.command)
    if (reason) return { block: true, reason }
    event.input.command = backgroundOpen(event.input.command)
  })
}
