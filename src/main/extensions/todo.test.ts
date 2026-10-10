import { describe, expect, it } from "vitest"
import type { TodoItem } from "../../shared/types"
import { todoExtension } from "./todo"

type SettleResult = { entries?: unknown[]; continue?: boolean } | undefined

function build() {
  let tool: { execute: (id: string, input: unknown) => Promise<unknown> } | undefined
  const handlers = new Map<string, (event: any, ctx?: any) => unknown>()
  const emitted: TodoItem[][] = []
  todoExtension((todos) => emitted.push(todos))({
    on: (event: string, handler: (event: any) => unknown) => {
      handlers.set(event, handler)
    },
    registerTool: (def: any) => {
      tool = def
    },
  } as never)
  return {
    tool: tool!,
    emitted,
    fire: (event: string, payload: any = {}) => handlers.get(event)?.(payload, {}),
    settle: (payload: { outcome?: string }): SettleResult =>
      handlers.get("agent_before_settle")?.({ outcome: "completed", ...payload }) as SettleResult,
  }
}

const TODO_CALL = {
  todos: [
    { text: "one", status: "completed" },
    { text: "two", status: "pending" },
  ],
}

describe("todo extension settle nudge", () => {
  it("asks for one final list update when the run settles with incomplete items", async () => {
    const ctx = build()
    ctx.fire("agent_start")
    await ctx.tool.execute("t1", TODO_CALL)
    ctx.fire("tool_execution_end", {})
    const result = ctx.settle({})
    expect(result?.continue).toBe(true)
    const entry = result?.entries?.[0] as { type: string; display: boolean; content: string }
    expect(entry.type).toBe("custom_message")
    expect(entry.display).toBe(false)
    expect(entry.content).toContain('"two"')
    expect(entry.content).not.toContain('"one"')
  })

  it("does not nudge when every item is completed", async () => {
    const ctx = build()
    ctx.fire("agent_start")
    await ctx.tool.execute("t1", { todos: [{ text: "one", status: "completed" }] })
    ctx.fire("tool_execution_end", {})
    expect(ctx.settle({})).toBeUndefined()
  })

  it("does not nudge a run that made no tool calls", async () => {
    const ctx = build()
    ctx.fire("agent_start")
    await ctx.tool.execute("t1", TODO_CALL)
    expect(ctx.settle({})).toBeUndefined()
  })

  it("does not nudge twice in the same run", async () => {
    const ctx = build()
    ctx.fire("agent_start")
    await ctx.tool.execute("t1", TODO_CALL)
    ctx.fire("tool_execution_end", {})
    ctx.settle({})
    const second = ctx.tool.execute("t2", TODO_CALL)
    expect(second).toBeDefined()
    await second
    ctx.fire("tool_execution_end", {})
    expect(ctx.settle({})).toBeUndefined()
  })

  it("re-arms the nudge on the next run", async () => {
    const ctx = build()
    ctx.fire("agent_start")
    await ctx.tool.execute("t1", TODO_CALL)
    ctx.fire("tool_execution_end", {})
    ctx.settle({})
    ctx.fire("agent_start")
    ctx.fire("tool_execution_end", {})
    expect(ctx.settle({})?.continue).toBe(true)
  })

  it("does not nudge after an aborted or errored run", async () => {
    const ctx = build()
    ctx.fire("agent_start")
    await ctx.tool.execute("t1", TODO_CALL)
    ctx.fire("tool_execution_end", {})
    expect(ctx.settle({ outcome: "aborted" })).toBeUndefined()
    expect(ctx.settle({ outcome: "error" })).toBeUndefined()
  })
})
