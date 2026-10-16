import { describe, expect, it } from "vitest"
import { AssistantTurn, type AssistantTurnProps } from "@/features/transcript/message-list/assistant-turn/assistant-turn"
import { viewMarkup } from "@/test/view-markup"

function props(overrides: Partial<AssistantTurnProps> = {}): AssistantTurnProps {
  return {
    messageId: "a1",
    model: null,
    tokensPerSecond: null,
    thinking: null,
    thinkingStreaming: false,
    workingLabel: null,
    thinkingLabel: null,
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

  it("fades the working phrase in once the small model names it", () => {
    const markup = viewMarkup(<AssistantTurn {...props({ text: null, waiting: true, workingLabel: "Planning the CSV import" })} />)

    expect(markup).toContain("Planning the CSV import")
    expect(markup).not.toContain("Working")
  })

  it("shows the reasoning as it streams", () => {
    const markup = viewMarkup(<AssistantTurn {...props({ thinking: "Considering the options", thinkingStreaming: true })} />)

    expect(markup).toContain("Thinking...")
  })

  it("shows locally measured TPS with the model that generated the reply", () => {
    const markup = viewMarkup(<AssistantTurn {...props({ model: "openai/gpt-4.1", tokensPerSecond: 32.45 })} />)

    expect(markup).toContain("32.5 tok/s · openai/gpt-4.1")
    expect(markup).toContain('title="openai/gpt-4.1"')
  })

  it("hides TPS when generation timing is unavailable", () => {
    const markup = viewMarkup(<AssistantTurn {...props()} />)

    expect(markup).not.toContain("tok/s")
  })

  it("shows the error in the destructive colour", () => {
    const markup = viewMarkup(<AssistantTurn {...props({ error: "Rate limit reached" })} />)

    expect(markup).toContain("Rate limit reached")
    expect(markup).toContain("text-destructive")
  })
})
