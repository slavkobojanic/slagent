import { describe, expect, it } from "vitest"
import { Editor, type EditorProps } from "@/features/editor/editor"
import { viewMarkup } from "@/test/view-markup"

const noop = () => {}

const base: EditorProps = {
  status: "ready",
  error: null,
  tabs: [
    { absolutePath: "/p/a.ts", path: "src/a.ts", name: "a.ts", dirty: false },
    { absolutePath: "/p/b.ts", path: "src/b.ts", name: "b.ts", dirty: true },
  ],
  activePath: "/p/a.ts",
  banner: null,
  hostRef: noop,
  onSelectTab: noop,
  onCloseTab: noop,
  onAnswerClose: noop,
  onReload: noop,
  onOverwrite: noop,
  onDismiss: noop,
  onExit: noop,
}

describe("Editor", () => {
  it("can show a tab per open file and select the active one", () => {
    const markup = viewMarkup(<Editor {...base} />)

    expect(markup).toContain(">a.ts<")
    expect(markup).toContain(">b.ts<")
    expect(markup).toMatch(/aria-selected="true"[^>]*title="src\/a.ts"/)
    expect(markup).toMatch(/aria-selected="false"[^>]*title="src\/b.ts"/)
  })

  it("can mark a tab with unsaved changes", () => {
    const markup = viewMarkup(<Editor {...base} />)

    expect(markup.match(/aria-label="Unsaved changes"/g)).toHaveLength(1)
  })

  it("can offer a way back to the chat", () => {
    expect(viewMarkup(<Editor {...base} />)).toContain("Back to chat")
  })

  it("can show an empty state when no file is open", () => {
    const markup = viewMarkup(<Editor {...base} tabs={[]} activePath={null} />)

    expect(markup).toContain("Open a file from the chat or the changes list to edit it.")
  })

  it("can cover the editor while it loads", () => {
    expect(viewMarkup(<Editor {...base} status="loading" />)).toContain("Loading editor")
  })

  it("can show why the editor failed to start", () => {
    const markup = viewMarkup(<Editor {...base} status="failed" error="no worker" />)

    expect(markup).toContain("no worker")
  })

  it("can ask before closing a tab with unsaved changes", () => {
    const markup = viewMarkup(<Editor {...base} banner={{ kind: "closing", name: "b.ts" }} />)

    expect(markup).toContain("Save changes to b.ts before closing?")
    expect(markup).toContain("Discard")
  })

  it("can offer reload or overwrite on a conflict", () => {
    const markup = viewMarkup(<Editor {...base} banner={{ kind: "conflict", name: "a.ts" }} />)

    expect(markup).toContain("a.ts changed on disk since you opened it.")
    expect(markup).toContain("Reload from disk")
    expect(markup).toContain("Overwrite")
  })

  it("can show an error banner", () => {
    const markup = viewMarkup(<Editor {...base} banner={{ kind: "error", message: "disk full" }} />)

    expect(markup).toContain("disk full")
    expect(markup).toContain("text-destructive")
  })

  it("can show a plain notice banner", () => {
    const markup = viewMarkup(<Editor {...base} tabs={[]} activePath={null} banner={{ kind: "notice", message: "logo.png is a binary file." }} />)

    expect(markup).toContain("logo.png is a binary file.")
  })
})
