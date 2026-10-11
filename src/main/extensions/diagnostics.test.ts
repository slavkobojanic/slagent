import { describe, expect, it } from "vitest"
import { diagnosticsExtension } from "./diagnostics"

function build() {
  const handlers = new Map<string, (event: any) => unknown>()
  diagnosticsExtension("/project")({
    on: (event: string, handler: (event: any) => unknown) => {
      handlers.set(event, handler)
    },
  } as never)
  return handlers.get("tool_result")!
}

const diagnostic = { severity: "error" as const, line: 3, column: 1, code: 2322, text: "nope" }

describe("diagnosticsExtension", () => {
  it("appends found diagnostics to the tool result", async () => {
    const service = await import("../diagnostics")
    const original = service.diagnostics.diagnose
    service.diagnostics.diagnose = async () => [diagnostic]
    try {
      const handler = build()
      const result = (await handler({
        toolName: "edit",
        isError: false,
        input: { path: "src/bad.ts" },
        content: [{ type: "text", text: "Edited." }],
      })) as { content?: { type: string; text?: string }[] } | undefined
      expect(result?.content?.length).toBe(2)
      expect(result?.content?.[1]?.text).toContain("TS2322")
    } finally {
      service.diagnostics.diagnose = original
    }
  })

  it("leaves the result alone when nothing was found", async () => {
    const service = await import("../diagnostics")
    const original = service.diagnostics.diagnose
    service.diagnostics.diagnose = async () => []
    try {
      const handler = build()
      const event = { toolName: "write", isError: false, input: { path: "src/ok.ts" }, content: [{ type: "text", text: "Wrote." }] }
      expect(await handler(event)).toBeUndefined()
    } finally {
      service.diagnostics.diagnose = original
    }
  })

  it("ignores failed results and other tools", async () => {
    const service = await import("../diagnostics")
    const original = service.diagnostics.diagnose
    service.diagnostics.diagnose = async () => [diagnostic]
    try {
      const handler = build()
      const failed = { toolName: "edit", isError: true, input: { path: "src/bad.ts" }, content: [] }
      expect(await handler(failed)).toBeUndefined()
      const read = { toolName: "read", isError: false, input: { path: "src/bad.ts" }, content: [] }
      expect(await handler(read)).toBeUndefined()
    } finally {
      service.diagnostics.diagnose = original
    }
  })
})
