import { describe, expect, it, vi } from "vitest"
import { viewMarkup } from "@/test/view-markup"
import { DiffPanel, type DiffPanelProps } from "./diff-panel"

function panel(overrides: Partial<DiffPanelProps> = {}): DiffPanelProps {
  return {
    branch: "main",
    scope: "uncommitted",
    scopeLabel: "Uncommitted",
    commits: [],
    loading: false,
    DiffFiles: () => <p>The files</p>,
    DiffFooter: () => <div>Commit box</div>,
    onScope: vi.fn(),
    onRefresh: vi.fn(),
    ...overrides,
  }
}

describe("DiffPanel", () => {
  it("can show the files and the commit box", () => {
    const markup = viewMarkup(<DiffPanel {...panel()} />)

    expect(markup).toContain("The files")
    expect(markup).toContain("Commit box")
  })

  it("can show the branch and the scope the dropdown shows", () => {
    const markup = viewMarkup(<DiffPanel {...panel({ scope: "turn", scopeLabel: "Last turn" })} />)

    expect(markup).toContain(">main<")
    expect(markup).toContain("Diff scope: Last turn")
    expect(markup).toContain("Last turn")
  })

  it("can show a commit subject as the scope", () => {
    const commit = { sha: "abc123def456", subject: "fix(diff): keep the draft", date: "2 hours ago" }
    const markup = viewMarkup(<DiffPanel {...panel({ scope: "commit:abc123def456", scopeLabel: commit.subject, commits: [commit] })} />)

    // The menu content renders only when open, so the subject shows in the trigger.
    expect(markup).toContain('aria-label="Diff scope: fix(diff): keep the draft"')
  })

  it("can spin the refresh icon while the diff loads", () => {
    const markup = viewMarkup(<DiffPanel {...panel({ loading: true })} />)

    expect(markup).toContain("animate-spin")
  })
})
