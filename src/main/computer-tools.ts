import type { ToolDefinition } from "@earendil-works/pi-coding-agent"
import { Type } from "typebox"
import type { ComputerUse } from "./computer"
import type { ComputerGate } from "./computer-gate"

const windowFields = {
  pid: Type.Number({ description: "Process id from computer_list_windows." }),
  window_id: Type.Number({ description: "Window id from computer_list_windows." }),
}

const listParams = Type.Object({
  app: Type.Optional(Type.String({ description: "Case-insensitive substring of the app name, for example Calculator." })),
  include_hidden: Type.Optional(Type.Boolean({ description: "Include off-screen and untitled windows. Default false." })),
})

type WindowInfo = {
  pid: number
  window_id: number
  app: string
  title: string
  on_screen: boolean
  x: number
  y: number
  width: number
  height: number
}

function filterWindows(windows: WindowInfo[], input: { app?: string; include_hidden?: boolean }): WindowInfo[] {
  const app = input.app?.trim().toLowerCase()
  return windows.filter((window) => {
    if (app && !window.app.toLowerCase().includes(app)) return false
    if (input.include_hidden) return true
    return window.on_screen && window.title !== ""
  })
}

function formatWindow(window: WindowInfo): string {
  const state = window.on_screen ? "" : " (hidden)"
  const title = window.title ? `"${window.title}"` : "untitled"
  return `${window.app} ${title}${state}: pid ${window.pid}, window_id ${window.window_id}, (${window.x}, ${window.y}, ${window.width}x${window.height})`
}

const openParams = Type.Object({
  app: Type.String({ description: "App name or bundle id, for example Dia, Calculator, or com.apple.Notes." }),
  url: Type.Optional(Type.String({ description: "URL to load in that app, for example reddit.com. Omit it to only launch the app." })),
})

const snapshotParams = Type.Object({
  ...windowFields,
  mode: Type.Optional(
    Type.Union([Type.Literal("ax"), Type.Literal("vision"), Type.Literal("som")], {
      description: "ax is the accessibility tree, vision is a window image, som is both. Default som.",
    }),
  ),
})

const clickParams = Type.Object({
  ...windowFields,
  element_index: Type.Optional(Type.Number({ description: "Index from the latest accessibility snapshot." })),
  x: Type.Optional(Type.Number({ description: "Screen x, used only when the target has no accessibility index." })),
  y: Type.Optional(Type.Number({ description: "Screen y, used only when the target has no accessibility index." })),
})

const typeParams = Type.Object({
  pid: windowFields.pid,
  text: Type.String({ description: "Characters to type into that process." }),
})

const setValueParams = Type.Object({
  ...windowFields,
  element_index: Type.Number({ description: "Index of a text field from the latest accessibility snapshot." }),
  text: Type.String({ description: "The full new value. It replaces the current value." }),
  submit: Type.Optional(Type.Boolean({ description: "Confirm the field afterwards, like pressing return. Default false." })),
})

const keyParams = Type.Object({
  pid: windowFields.pid,
  key: Type.String({
    description: "One key: return, tab, space, delete, escape, an arrow, home, end, pageup, pagedown, f1-f12, or a single letter, digit, or punctuation key.",
  }),
  modifiers: Type.Optional(
    Type.Array(Type.String(), { description: "Held modifiers: cmd, shift, option, ctrl, or fn. For example key l with [\"cmd\"] for cmd+L." }),
  ),
})

const scrollParams = Type.Object({
  ...windowFields,
  x: Type.Number({ description: "Screen x of the control that should scroll." }),
  y: Type.Number({ description: "Screen y of the control that should scroll." }),
  delta_y: Type.Optional(Type.Number({ description: "Pixel delta. Negative scrolls down." })),
})

const guidelines = [
  "Computer use runs in the background next to the user, who keeps working. Do everything through the computer_* tools, which use the Accessibility API and never move the user's pointer, change their keyboard focus, or bring windows to the front. Do not use osascript, System Events, `activate`, or the shell `open` command to launch apps or load URLs. They bring apps to the front.",
  "To launch an app, or load a URL in a browser, use computer_open, for example app Dia with url reddit.com. It opens in the background and reverts any attempt by the app to bring itself forward. Navigating a browser this way is more reliable than editing its address bar.",
  "Workflow: computer_list_windows with an app filter gives you the pid and window_id. Then computer_snapshot, act by element_index, and snapshot again. Element indexes are only valid for the latest snapshot of that window, so take a new one after any action that changes the UI.",
  "Buttons, links, menus, and checkboxes: use computer_click with element_index. It performs the accessibility press without touching the pointer. Use x and y only for canvas areas and other nodes without an index.",
  "Text fields and search boxes: use computer_set_value with the field's element_index, and set submit to true to press return. If it reports that the field did not accept the value, the field is not editable over Accessibility. Do not retry it, and do not fall back to keystrokes for the same field. Some address bars, such as those in Dia and Arc, behave this way, so use computer_open with a url for those. Chromium can also echo a value it rejected, so confirm the effect in a fresh snapshot.",
  "computer_type and computer_key post keystrokes to whatever has focus inside the target app. Background apps often drop them. Use them only for rich editors that reject computer_set_value, after a snapshot shows the right element is focused. computer_key takes modifiers such as cmd.",
  "Verify each meaningful step in a fresh snapshot. If an input landed somewhere it should not have, or the same approach failed twice, stop and tell the user what happened instead of trying more variations.",
]

export function computerTools(computer: ComputerUse, gate: ComputerGate): ToolDefinition[] {
  return [
    {
      name: "computer_open",
      label: "Open",
      description: "Launch an app, or load a URL in an app, in the background without bringing it to the front. Use this instead of the shell open command.",
      promptSnippet: "Open an app or URL in the background",
      promptGuidelines: guidelines,
      parameters: openParams,
      async execute(_id, params) {
        const input = params as { app: string; url?: string }
        return gate.run(async () => {
          const result = await computer.call("open", { app: input.app, url: input.url })
          const target = input.url ? `${input.url} in ${result.app}` : String(result.app)
          return textResult(`Opened ${target} in the background (pid ${result.pid}). Call computer_list_windows with app "${result.app}" to find its window.`)
        })
      },
    },
    {
      name: "computer_list_windows",
      label: "List windows",
      description: "List macOS windows the agent can drive without raising them. By default it hides off-screen and untitled windows. Pass app to filter by app name.",
      promptSnippet: "List windows for background computer use",
      promptGuidelines: guidelines,
      parameters: listParams,
      async execute(_id, params) {
        const input = params as { app?: string; include_hidden?: boolean }
        const result = await computer.call("list_windows")
        const windows = filterWindows((result.windows ?? []) as WindowInfo[], input)
        if (windows.length === 0) return textResult("No matching windows. Try include_hidden, or open the app first.")
        return textResult(windows.map(formatWindow).join("\n"))
      },
    },
    {
      name: "computer_snapshot",
      label: "Snapshot window",
      description: "Read one window. ax returns an indexed accessibility tree. vision returns a PNG. som returns both.",
      promptSnippet: "Snapshot a window by accessibility tree, pixels, or both",
      promptGuidelines: guidelines,
      parameters: snapshotParams,
      async execute(_id, params) {
        const input = params as { pid: number; window_id: number; mode?: "ax" | "vision" | "som" }
        const result = await computer.call("snapshot", {
          pid: input.pid,
          window_id: input.window_id,
          mode: input.mode ?? "som",
        })
        const content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }> = []
        if (typeof result.markdown === "string") content.push({ type: "text", text: result.markdown })
        if (typeof result.image === "string") {
          content.push({ type: "image", data: result.image, mimeType: "image/png" })
        }
        if (content.length === 0) content.push({ type: "text", text: "The snapshot was empty." })
        return { content, details: { mode: input.mode ?? "som" } }
      },
    },
    {
      name: "computer_click",
      label: "Click",
      description: "Click a window without moving the user's pointer. Prefer element_index. A marker is drawn on the target. x and y are screen coordinates for non-accessibility targets.",
      promptSnippet: "Background click by element index or screen point",
      promptGuidelines: guidelines,
      parameters: clickParams,
      async execute(_id, params) {
        const input = params as { pid: number; window_id: number; element_index?: number; x?: number; y?: number }
        return gate.run(async () => {
          await computer.call("click", { ...input })
          return textResult("Clicked.")
        })
      },
    },
    {
      name: "computer_set_value",
      label: "Set value",
      description: "Set a text field's value through the Accessibility API, without keystrokes, pointer movement, or focus changes. Optionally submit it. Prefer this to computer_type for any field that has an element_index.",
      promptSnippet: "Fill a text field by accessibility index",
      promptGuidelines: guidelines,
      parameters: setValueParams,
      async execute(_id, params) {
        const input = params as { pid: number; window_id: number; element_index: number; text: string; submit?: boolean }
        return gate.run(async () => {
          const result = await computer.call("set_value", { ...input })
          const value =
            typeof result.value === "string"
              ? ` The field reports "${result.value}". Chromium apps can echo a value they never accepted, so confirm the effect in a new snapshot.`
              : ""
          return textResult(`${result.submitted ? "Set and submitted." : "Set."}${value}`)
        })
      },
    },
    {
      name: "computer_type",
      label: "Type",
      description: "Post keystrokes to whatever element is focused inside a process. This is a fallback for fields where computer_set_value does not work.",
      promptSnippet: "Type into a background process",
      parameters: typeParams,
      async execute(_id, params) {
        const input = params as { pid: number; text: string }
        return gate.run(async () => {
          await computer.call("type_text", { pid: input.pid, text: input.text })
          return textResult("Typed.")
        })
      },
    },
    {
      name: "computer_key",
      label: "Key",
      description: "Press a key, optionally with modifiers, in a process. It goes to the element focused inside that process.",
      promptSnippet: "Press a key in a background process",
      parameters: keyParams,
      async execute(_id, params) {
        const input = params as { pid: number; key: string; modifiers?: string[] }
        const modifiers = input.modifiers ?? []
        return gate.run(async () => {
          await computer.call("key", { pid: input.pid, key: input.key, modifiers })
          return textResult(`Pressed ${[...modifiers, input.key].join("+")}.`)
        })
      },
    },
    {
      name: "computer_scroll",
      label: "Scroll",
      description: "Scroll the control under a screen point in a background window.",
      promptSnippet: "Scroll a background window",
      parameters: scrollParams,
      async execute(_id, params) {
        const input = params as { pid: number; window_id: number; x: number; y: number; delta_y?: number }
        return gate.run(async () => {
          await computer.call("scroll", { ...input })
          return textResult("Scrolled.")
        })
      },
    },
  ]
}

function textResult(text: string) {
  return {
    content: [{ type: "text" as const, text }],
    details: {},
  }
}

export const COMPUTER_TOOL_NAMES = [
  "computer_open",
  "computer_list_windows",
  "computer_snapshot",
  "computer_click",
  "computer_set_value",
  "computer_type",
  "computer_key",
  "computer_scroll",
]
