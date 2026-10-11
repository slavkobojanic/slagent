import { act, fireEvent, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { viewMarkup } from "@/test/view-markup"
import type { ToolMessage } from "@shared/types"
import { createToolChain } from "@/features/transcript/message-list/assistant-turn/tool-chain/create"

// A bash tool renders its output inline, and its raw "bash  command" label describes nothing, so
// the collapsed header reads "Tools" instead of a summary built from the labels.
function tool(id: string, overrides: Partial<ToolMessage> = {}): ToolMessage {
  return { id, role: "tool", name: "bash", label: "bash  npm test", args: "", output: "step body", images: [], running: false, isError: false, ...overrides }
}

function create() {
  type Deps = Parameters<typeof createToolChain>[0]
  return createToolChain({ window, panelPresenter: { openFile: vi.fn() } as unknown as Deps["panelPresenter"] })
}

describe("ToolChain", () => {
  it("lists each step under the Tools header with its label", () => {
    const Chain = create()
    const markup = viewMarkup(<Chain tools={[tool("t1"), tool("t2", { running: true })]} turnId="turn" />)

    expect(markup).toContain("Tools")
    expect(markup).toContain("Ran shell command")
    expect(markup).toContain("Running shell command")
  })

  it("collapses the steps when it starts closed", () => {
    const Chain = create()
    const markup = viewMarkup(<Chain tools={[tool("t1")]} turnId="turn" />)

    expect(markup).toContain("Tools")
    expect(markup).not.toContain("Ran shell command")
  })

  it("summarizes the steps in the header once they are described", () => {
    const Chain = create()
    const markup = viewMarkup(<Chain tools={[tool("t1", { narration: "Reading the README, listing the source files" })]} turnId="turn" />)

    expect(markup).toContain("Reading the README, listing the source files")
    expect(markup).not.toContain("Tools")
  })

  it("fades the summary in", () => {
    const Chain = create()
    const markup = viewMarkup(<Chain tools={[tool("t1", { narration: "Reading the README" })]} turnId="turn" />)

    expect(markup).toContain("animate-in")
  })

  it("shows a failed step in the destructive colour", () => {
    const Chain = create()
    const markup = viewMarkup(<Chain tools={[tool("t1", { running: true, isError: true })]} turnId="turn" />)

    expect(markup).toContain("step body")
    expect(markup).toContain("text-destructive")
  })

  it("hides the output of a finished step", () => {
    const Chain = create()
    const markup = viewMarkup(<Chain tools={[tool("t1")]} turnId="turn" />)

    expect(markup).not.toContain("step body")
  })

  it("shows the output of a running step", () => {
    const Chain = create()
    const markup = viewMarkup(<Chain tools={[tool("t1", { running: true })]} turnId="turn" />)

    expect(markup).toContain("step body")
  })

  it("keeps the output of a failed step open", () => {
    const Chain = create()
    const markup = viewMarkup(<Chain tools={[tool("t1", { running: true, isError: true })]} turnId="turn" />)

    expect(markup).toContain("step body")
  })

  it("re-opens a finished step's output when you click it", () => {
    const Chain = create()
    const view = render(<Chain tools={[tool("t1"), tool("t2", { running: true })]} turnId="turn" />)

    fireEvent.click(view.getByText("Ran shell command"))

    expect(view.container.innerHTML).toContain("step body")
  })

  it("collapses a running chain once the steps have been quiet for a moment", async () => {
    vi.useFakeTimers()
    try {
      const Chain = create()
      const view = render(<Chain tools={[tool("t1", { running: true })]} turnId="turn" />)

      expect(view.container.innerHTML).toContain("Running shell command")

      view.rerender(<Chain tools={[tool("t1")]} turnId="turn" />)

      expect(view.container.innerHTML).toContain("Ran shell command")

      await act(async () => {
        vi.advanceTimersByTime(1100)
      })

      expect(view.container.innerHTML).not.toContain("Ran shell command")
    } finally {
      vi.useRealTimers()
    }
  })

  it("stays open while a later step keeps running", async () => {
    vi.useFakeTimers()
    try {
      const Chain = create()
      const view = render(<Chain tools={[tool("t1", { running: true })]} turnId="turn" />)

      view.rerender(<Chain tools={[tool("t1"), tool("t2", { running: true })]} turnId="turn" />)

      await act(async () => {
        vi.advanceTimersByTime(2000)
      })

      expect(view.container.innerHTML).toContain("Running shell command")
    } finally {
      vi.useRealTimers()
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })
})
