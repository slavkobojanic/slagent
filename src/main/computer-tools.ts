import type { ToolDefinition } from "@earendil-works/pi-coding-agent"
import { Type } from "typebox"
import type { ComputerUse } from "./computer"
import type { ComputerGate } from "./computer-gate"

const windowFields = {
  pid: Type.Number({ description: "Process id from computer_list_windows." }),
  window_id: Type.Number({ description: "Window id from computer_list_windows." }),
}

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

const keyParams = Type.Object({
  pid: windowFields.pid,
  key: Type.String({
    description: "return, tab, space, delete, escape, left, right, up, or down.",
  }),
})

const scrollParams = Type.Object({
  ...windowFields,
  x: Type.Number({ description: "Screen x of the control that should scroll." }),
  y: Type.Number({ description: "Screen y of the control that should scroll." }),
  delta_y: Type.Optional(Type.Number({ description: "Pixel delta. Negative scrolls down." })),
})

const guidelines = [
  "Use computer_list_windows, then computer_snapshot, before clicking.",
  "Click with element_index when the accessibility tree has one. Pixel clicks are only for canvas and other nodes without an index.",
  "These actions stay in the target app. The user's pointer is not moved.",
]

export function computerTools(computer: ComputerUse, gate: ComputerGate): ToolDefinition[] {
  return [
    {
      name: "computer_list_windows",
      label: "List windows",
      description: "List macOS windows the agent can drive without raising them.",
      promptSnippet: "List windows for background computer use",
      promptGuidelines: guidelines,
      parameters: Type.Object({}),
      async execute() {
        const result = await computer.call("list_windows")
        return textResult(JSON.stringify(result.windows ?? [], null, 2))
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
      name: "computer_type",
      label: "Type",
      description: "Type text into a process without moving the user's keyboard focus.",
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
      description: "Press a named key in a process.",
      promptSnippet: "Press a key in a background process",
      parameters: keyParams,
      async execute(_id, params) {
        const input = params as { pid: number; key: string }
        return gate.run(async () => {
          await computer.call("key", { pid: input.pid, key: input.key })
          return textResult(`Pressed ${input.key}.`)
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
  "computer_list_windows",
  "computer_snapshot",
  "computer_click",
  "computer_type",
  "computer_key",
  "computer_scroll",
]
