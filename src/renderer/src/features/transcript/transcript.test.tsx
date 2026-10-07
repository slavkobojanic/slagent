import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Transcript, type TranscriptProps } from "@/features/transcript/transcript"
import { viewMarkup } from "@/test/view-markup"

const noop = () => undefined

// The conversation measures its content, which jsdom cannot do.
class StubResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function slot(text: string) {
  return function Slot() {
    return <p>{text}</p>
  }
}

function props(overrides: Partial<TranscriptProps> = {}): TranscriptProps {
  return {
    streaming: false,
    attachScroll: noop,
    onSettle: noop,
    MessageList: slot("Message list"),
    PlanCard: slot("Plan card"),
    Status: slot("Working on it"),
    ScrollDown: slot("Scroll down"),
    QuestionCard: slot("Question card"),
    ...overrides,
  }
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", StubResizeObserver)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("Transcript", () => {
  it("renders the messages inside the chat log", () => {
    const markup = viewMarkup(<Transcript {...props()} />)

    expect(markup).toContain('role="log"')
    expect(markup).toContain("chat-transcript")
    expect(markup).toContain("Message list")
  })

  it("renders the plan and the status line after the messages", () => {
    const markup = viewMarkup(<Transcript {...props()} />)

    expect(markup.indexOf("Message list")).toBeLessThan(markup.indexOf("Plan card"))
    expect(markup.indexOf("Plan card")).toBeLessThan(markup.indexOf("Working on it"))
  })

  it("renders the scroll-down control inside the conversation", () => {
    const markup = viewMarkup(<Transcript {...props()} />)

    expect(markup).toContain("Scroll down")
  })

  it("renders the question card after the conversation", () => {
    const markup = viewMarkup(<Transcript {...props()} />)

    expect(markup.indexOf("Scroll down")).toBeLessThan(markup.indexOf("Question card"))
  })
})
