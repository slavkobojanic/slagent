import { describe, expect, it } from "vitest"
import { narrationParts } from "./format"

describe("narrationParts", () => {
  it("sends all the text to the reply when no tool call follows it", () => {
    const content = [
      { type: "thinking", thinking: "Considering the options" },
      { type: "text", text: "Here is what I found." },
    ]

    expect(narrationParts(content)).toEqual({ narrations: [], text: "Here is what I found." })
  })

  it("makes the text before a tool call that call's narration", () => {
    const content = [
      { type: "text", text: "Starting by exploring the codebase." },
      { type: "toolCall", id: "t1", name: "read", arguments: {} },
    ]

    expect(narrationParts(content)).toEqual({ narrations: ["Starting by exploring the codebase."], text: "" })
  })

  it("pairs each tool call with the run of text before it", () => {
    const content = [
      { type: "text", text: "First search." },
      { type: "toolCall", id: "t1", name: "search", arguments: {} },
      { type: "text", text: "Now the second search." },
      { type: "toolCall", id: "t2", name: "search", arguments: {} },
    ]

    expect(narrationParts(content)).toEqual({ narrations: ["First search.", "Now the second search."], text: "" })
  })

  it("keeps prose after the last call as reply text", () => {
    const content = [
      { type: "text", text: "Checking the tests." },
      { type: "toolCall", id: "t1", name: "bash", arguments: {} },
      { type: "text", text: "All green." },
    ]

    expect(narrationParts(content)).toEqual({ narrations: ["Checking the tests."], text: "All green." })
  })

  it("keeps an empty narration for a call the model made without words", () => {
    const content = [
      { type: "toolCall", id: "t1", name: "bash", arguments: {} },
      { type: "text", text: "Done." },
    ]

    expect(narrationParts(content)).toEqual({ narrations: [""], text: "Done." })
  })
})
