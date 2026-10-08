import { describe, expect, it } from "vitest"
import type { AssistantMessage, ToolMessage, UserMessage } from "@shared/types"
import { awaitingModel, groupMessages, lastEditableMessage, sameTurn, waitingForText } from "@/features/transcript/transcript-blocks"

function user(id: string, overrides: Partial<UserMessage> = {}): UserMessage {
  return { id, role: "user", text: `prompt ${id}`, attachments: [], entryId: `entry-${id}`, ...overrides }
}

function assistant(id: string, overrides: Partial<AssistantMessage> = {}): AssistantMessage {
  return { id, role: "assistant", text: "", thinking: "", streaming: false, error: null, ...overrides }
}

function tool(id: string, overrides: Partial<ToolMessage> = {}): ToolMessage {
  return {
    id,
    role: "tool",
    name: "bash",
    label: "bash  ls",
    args: "{}",
    output: "",
    images: [],
    running: false,
    isError: false,
    ...overrides,
  }
}

describe("groupMessages", () => {
  it("can give a user message a block of its own", () => {
    const blocks = groupMessages([user("u1")])

    expect(blocks).toEqual([{ kind: "user", message: user("u1") }])
  })

  it("can attach the tool calls that follow a reply to that reply's turn", () => {
    const blocks = groupMessages([user("u1"), assistant("a1"), tool("t1"), tool("t2")])

    expect(blocks).toHaveLength(2)
    expect(blocks[1]).toMatchObject({ kind: "turn", turn: { id: "a1", tools: [{ id: "t1" }, { id: "t2" }] } })
  })

  it("can open a turn without a reply for tool calls that arrive before any reply", () => {
    const blocks = groupMessages([tool("t1")])

    expect(blocks).toMatchObject([{ kind: "turn", turn: { id: "t1", assistant: null, tools: [{ id: "t1" }] } }])
  })

  it("can start a new turn after a user message", () => {
    const blocks = groupMessages([assistant("a1"), user("u1"), tool("t1")])

    expect(blocks).toMatchObject([
      { kind: "turn", turn: { id: "a1", tools: [] } },
      { kind: "user", message: { id: "u1" } },
      { kind: "turn", turn: { id: "t1", assistant: null, tools: [{ id: "t1" }] } },
    ])
  })
})

describe("sameTurn", () => {
  const reply = assistant("a1")
  const first = tool("t1")

  it("can match a rebuilt turn holding the same messages", () => {
    expect(sameTurn({ id: "a1", assistant: reply, tools: [first] }, { id: "a1", assistant: reply, tools: [first] })).toBe(true)
  })

  it("can tell apart a turn whose reply was replaced", () => {
    expect(sameTurn({ id: "a1", assistant: reply, tools: [] }, { id: "a1", assistant: { ...reply }, tools: [] })).toBe(false)
  })

  it("can tell apart a turn whose tool calls changed", () => {
    expect(sameTurn({ id: "a1", assistant: reply, tools: [first] }, { id: "a1", assistant: reply, tools: [{ ...first }] })).toBe(false)
    expect(sameTurn({ id: "a1", assistant: reply, tools: [first] }, { id: "a1", assistant: reply, tools: [first, tool("t2")] })).toBe(false)
  })
})

describe("lastEditableMessage", () => {
  it("can find the last user message that has an entry", () => {
    const found = lastEditableMessage([user("u1"), assistant("a1"), user("u2")])

    expect(found?.id).toBe("u2")
  })

  it("can skip a later user message that has no entry", () => {
    const found = lastEditableMessage([user("u1"), user("u2", { entryId: undefined })])

    expect(found?.id).toBe("u1")
  })

  it("can find nothing when no user message can be edited", () => {
    expect(lastEditableMessage([assistant("a1")])).toBeUndefined()
  })
})

describe("awaitingModel", () => {
  it("can await nothing when the run is not streaming", () => {
    expect(awaitingModel([user("u1")], false)).toBe(false)
  })

  it("can await the model right after a send, before any message", () => {
    expect(awaitingModel([], true)).toBe(true)
  })

  it("can await the model after a user message", () => {
    expect(awaitingModel([user("u1")], true)).toBe(true)
  })

  it("can await the model after a tool has finished", () => {
    expect(awaitingModel([assistant("a1"), tool("t1", { running: false })], true)).toBe(true)
  })

  it("can keep quiet while a tool is still running", () => {
    expect(awaitingModel([assistant("a1"), tool("t1", { running: true })], true)).toBe(false)
  })

  it("can keep quiet while the reply is streaming", () => {
    expect(awaitingModel([user("u1"), assistant("a1", { streaming: true, text: "Hi" })], true)).toBe(false)
  })

  it("can await the model once a streamed reply has finished", () => {
    expect(awaitingModel([user("u1"), assistant("a1", { streaming: false, text: "Hi" })], true)).toBe(true)
  })
})

describe("waitingForText", () => {
  it("can wait while a reply has started with no text, reasoning or running tool", () => {
    expect(waitingForText(assistant("a1", { streaming: true }), [])).toBe(true)
  })

  it("can stop waiting once the reply has text", () => {
    expect(waitingForText(assistant("a1", { streaming: true, text: "Hi" }), [])).toBe(false)
  })

  it("can stop waiting once the reply has reasoning", () => {
    expect(waitingForText(assistant("a1", { streaming: true, thinking: "Hmm" }), [])).toBe(false)
  })

  it("can stop waiting while a tool is running", () => {
    expect(waitingForText(assistant("a1", { streaming: true }), [tool("t1", { running: true })])).toBe(false)
  })

  it("can not wait without a reply", () => {
    expect(waitingForText(null, [])).toBe(false)
  })

  it("can not wait once the reply has finished", () => {
    expect(waitingForText(assistant("a1", { streaming: false }), [])).toBe(false)
  })
})
