import { describe, expect, it } from "vitest"
import { Editor, type EditorProps } from "@/features/editor/editor"
import { viewMarkup } from "@/test/view-markup"

const noop = () => {}

const base: EditorProps = {
  url: "http://127.0.0.1:4000/?tkn=abc&folder=%2Fp",
  status: "ready",
  error: null,
  frameRef: noop,
  onFrameLoad: noop,
  onCommand: noop,
  onRetry: noop,
  onExit: noop,
}

describe("Editor", () => {
  it("can show the workbench in a frame", () => {
    const markup = viewMarkup(<Editor {...base} />)

    expect(markup).toContain("<iframe")
    expect(markup).toContain('src="http://127.0.0.1:4000/?tkn=abc&amp;folder=%2Fp"')
  })

  it("can offer a button for each of the workbench's views", () => {
    const markup = viewMarkup(<Editor {...base} />)

    for (const label of ["Files", "Search", "Source control", "Run and debug", "Extensions"]) {
      expect(markup).toContain(`aria-label="${label}"`)
    }
  })

  it("can offer a way back to the chat", () => {
    expect(viewMarkup(<Editor {...base} />)).toContain("Back to chat")
  })

  it("can cover the frame while it loads and lock the view buttons", () => {
    const markup = viewMarkup(<Editor {...base} status="loading" />)

    expect(markup).toContain("Loading the editor")
    expect(markup).toContain('aria-label="Files"')
    expect(markup).toMatch(/disabled=""[^>]*aria-label="Files"|aria-label="Files"[^>]*disabled=""/)
  })

  it("can say the editor is starting before it has a page", () => {
    const markup = viewMarkup(<Editor {...base} url={null} status="loading" />)

    expect(markup).toContain("Starting the editor")
    expect(markup).not.toContain("<iframe")
  })

  it("can show why the editor failed and offer to retry", () => {
    const markup = viewMarkup(<Editor {...base} url={null} status="failed" error="The editor server stopped (exit 1)." />)

    expect(markup).toContain("The editor server stopped (exit 1).")
    expect(markup).toContain("Try again")
    expect(markup).toContain('role="alert"')
  })

  it("can fall back to a plain message when the failure has no text", () => {
    expect(viewMarkup(<Editor {...base} url={null} status="failed" />)).toContain("The editor could not start.")
  })
})
