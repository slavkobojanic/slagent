import { describe, expect, it } from "vitest"
import { AssistantTurn, type AssistantTurnProps } from "@/features/transcript/message-list/assistant-turn/assistant-turn"
import { viewMarkup } from "@/test/view-markup"

function props(overrides: Partial<AssistantTurnProps> = {}): AssistantTurnProps {
  return {
    messageId: "a1",
    thinking: null,
    thinkingStreaming: false,
    tools: null,
    waiting: false,
    text: <p>Hello there</p>,
    error: null,
    ...overrides,
  }
}

describe("AssistantTurn", () => {
  it("shows the reply text with no reasoning, tools or working line", () => {
    const markup = viewMarkup(<AssistantTurn {...props()} />)

    expect(markup).toContain("Hello there")
    expect(markup).toContain('data-message-id="a1"')
    expect(markup).not.toContain("Working")
  })

  it("shows the working line while the reply has not produced text yet", () => {
    const markup = viewMarkup(<AssistantTurn {...props({ text: null, waiting: true })} />)

    expect(markup).toContain("Working")
  })

  it("shows the reasoning as it streams", () => {
    const markup = viewMarkup(<AssistantTurn {...props({ thinking: "Considering the options", thinkingStreaming: true })} />)

    expect(markup).toContain("Thinking...")
  })

  it("shows the error in the destructive colour", () => {
    const markup = viewMarkup(<AssistantTurn {...props({ error: "Rate limit reached" })} />)

    expect(markup).toContain("Rate limit reached")
    expect(markup).toContain("text-destructive")
  })
})
