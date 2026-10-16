// @vitest-environment node
import { describe, expect, it } from "vitest"
import type { AssistantMessage, Message, ToolResultMessage, UserMessage } from "@earendil-works/pi-ai"
import { renderTranscript, turnPrompt } from "./transcript"

function user(text: string): UserMessage {
  return { role: "user", content: text, timestamp: 1 }
}

function assistant(text: string, tools: string[] = []): AssistantMessage {
  return {
    role: "assistant",
    content: [
      ...(text ? [{ type: "text" as const, text }] : []),
      ...tools.map((name) => ({ type: "toolCall" as const, id: name, name, arguments: {} })),
    ],
    api: "muse-msp",
    provider: "muse-bridge",
    model: "muse-wonder-1.0",
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
    stopReason: "stop",
    timestamp: 2,
  }
}

function toolResult(name: string, text: string, isError = false): ToolResultMessage {
  return { role: "toolResult", toolCallId: name, toolName: name, content: [{ type: "text", text }], isError, timestamp: 3 }
}

describe("renderTranscript", () => {
  it("can label every role", () => {
    const messages: Message[] = [
      { role: "system", content: "Be helpful.", timestamp: 0 },
      user("fix the bug"),
      assistant("looking", ["bash"]),
      toolResult("bash", "OK"),
    ]
    expect(renderTranscript(messages)).toBe(
      [
        "[system]\nBe helpful.",
        "[user]\nfix the bug",
        "[assistant]\nlooking\nused tool bash",
        "[tool result: bash]\nOK",
      ].join("\n\n"),
    )
  })

  it("can skip empty messages", () => {
    const messages: Message[] = [user(""), assistant("", [])]
    expect(renderTranscript(messages)).toBe("")
  })

  it("can stand in for images", () => {
    const messages: Message[] = [{ role: "user", content: [{ type: "image", data: "AAAA", mimeType: "image/png" }], timestamp: 1 }]
    expect(renderTranscript(messages)).toBe("[user]\n[image attached]")
  })

  it("can mark failed tool results", () => {
    const messages: Message[] = [toolResult("edit", "", true)]
    expect(renderTranscript(messages)).toBe("[tool result: edit]\nthe call failed")
  })

  it("can ask Muse to continue the transcript", () => {
    const prompt = turnPrompt("[user]\nhello")
    expect(prompt).toContain("the last [user] block is what to do now")
    expect(prompt.endsWith("[user]\nhello")).toBe(true)
  })
})
