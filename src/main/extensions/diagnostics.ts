import type { ExtensionFactory } from "@earendil-works/pi-coding-agent"
import { resolve } from "node:path"
import { diagnostics, formatDiagnostics } from "../diagnostics"

// After the edit or write tool changes a file, the current tsserver
// diagnostics for it ride along in the tool result. The agent learns the type
// errors of its own change in the same turn instead of discovering them
// through a failed build later. No typescript, a timeout or a crash means no
// diagnostics and no other change to the result.

export function diagnosticsExtension(cwd: string): ExtensionFactory {
  return (pi) => {
    pi.on("tool_result", async (event) => {
      if (event.toolName !== "edit" && event.toolName !== "write") return
      if (event.isError) return
      if (typeof event.input.path !== "string" || event.input.path === "") return
      const absolute = resolve(cwd, event.input.path)
      const found = await diagnostics.diagnose(cwd, absolute)
      if (found.length === 0) return
      return { content: [...event.content, { type: "text", text: formatDiagnostics(cwd, absolute, found) }] }
    })
  }
}
