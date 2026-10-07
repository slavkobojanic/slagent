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

function ScrollDownStub() {
  return <button type="button">Scroll down</button>
}

function props(overrides: Partial<TranscriptProps> = {}): TranscriptProps {
  return {
    streaming: false,
    intro: null,
    rows: [],
    plan: null,
    status: null,
    ScrollDown: ScrollDownStub,
    attachScroll: noop,
    onSettle: noop,
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
  it("renders the rows inside the chat log, under the intro", () => {
    const markup = viewMarkup(
      <Transcript
        {...props({
          intro: <p>Ask for a change</p>,
          rows: [<p key="a">First row</p>, <p key="b">Second row</p>],
        })}
      />,
    )

    expect(markup).toContain('role="log"')
    expect(markup).toContain("chat-transcript")
    expect(markup.indexOf("Ask for a change")).toBeLessThan(markup.indexOf("First row"))
    expect(markup.indexOf("First row")).toBeLessThan(markup.indexOf("Second row"))
  })

  it("renders the plan and the status line after the rows", () => {
    const markup = viewMarkup(
      <Transcript
        {...props({
          rows: [<p key="a">Reply</p>],
          plan: <p>Plan card</p>,
          status: <p>Working on it</p>,
        })}
      />,
    )

    expect(markup.indexOf("Reply")).toBeLessThan(markup.indexOf("Plan card"))
    expect(markup.indexOf("Plan card")).toBeLessThan(markup.indexOf("Working on it"))
  })

  it("renders the scroll-down control inside the conversation", () => {
    const markup = viewMarkup(<Transcript {...props()} />)

    expect(markup).toContain("Scroll down")
  })
})
