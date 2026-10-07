import { describe, expect, it, vi } from "vitest"
import { SAMPLE_DIFF } from "@/features/changes/changes-fixtures"
import { DiffPanel, type DiffPanelProps } from "@/features/changes/diff-panel/diff-panel"
import { parseDiff } from "@/lib/diff"
import { viewMarkup } from "@/test/view-markup"

function panel(overrides: Partial<DiffPanelProps> = {}): DiffPanelProps {
  return {
    branch: "main",
    scope: "uncommitted",
    loading: false,
    files: [],
    emptyText: "No uncommitted changes.",
    comments: [],
    draft: null,
    themeType: "dark",
    footer: <div>Commit box</div>,
    onScope: vi.fn(),
    onRefresh: vi.fn(),
    onStartDraft: vi.fn(),
    onDraftSave: vi.fn(),
    onDraftCancel: vi.fn(),
    onRemoveComment: vi.fn(),
    onViewFile: vi.fn(),
    ...overrides,
  }
}

describe("DiffPanel", () => {
  it("can show the empty message and the commit box when a repository has no changes", () => {
    const markup = viewMarkup(<DiffPanel {...panel()} />)

    expect(markup).toContain("No uncommitted changes.")
    expect(markup).toContain("Commit box")
  })

  it("can show the not-a-repository message without a commit box", () => {
    const markup = viewMarkup(<DiffPanel {...panel({ emptyText: "This folder is not a git repository.", footer: null, branch: "Changes" })} />)

    expect(markup).toContain("This folder is not a git repository.")
    expect(markup).not.toContain("Commit box")
  })

  it("can show the branch and press the scope that is shown", () => {
    const markup = viewMarkup(<DiffPanel {...panel({ scope: "turn", emptyText: "No changes since the last message with a checkpoint." })} />)

    expect(markup).toContain(">main<")
    expect(markup).toMatch(/aria-pressed="true"[^>]*>Last turn</)
    expect(markup).toMatch(/aria-pressed="false"[^>]*>Uncommitted</)
  })

  it("can show each changed file's diff with its View file action when the diff has changes", () => {
    const markup = viewMarkup(<DiffPanel {...panel({ files: parseDiff(SAMPLE_DIFF) })} />)

    expect(markup).toContain("View file")
    expect(markup).not.toContain("No uncommitted changes.")
  })

  it("can spin the refresh icon while the diff loads", () => {
    const markup = viewMarkup(<DiffPanel {...panel({ loading: true })} />)

    expect(markup).toContain("animate-spin")
  })
})
