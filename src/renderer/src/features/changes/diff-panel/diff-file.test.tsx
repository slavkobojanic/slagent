import { describe, expect, it, vi } from "vitest"
import { makeComment, SAMPLE_DIFF } from "@/features/changes/changes-fixtures"
import { DiffFile, type DiffFileProps } from "@/features/changes/diff-panel/diff-file"
import { parseDiff } from "@/lib/diff"
import { viewMarkup } from "@/test/view-markup"

const file = parseDiff(SAMPLE_DIFF)[0]

function diffFile(overrides: Partial<DiffFileProps> = {}): DiffFileProps {
  return {
    file,
    comments: [],
    draft: null,
    themeType: "dark",
    onStartDraft: vi.fn(),
    onDraftSave: vi.fn(),
    onDraftCancel: vi.fn(),
    onRemoveComment: vi.fn(),
    onViewFile: vi.fn(),
    ...overrides,
  }
}

describe("DiffFile", () => {
  it("can render the file's diff with a View file action", () => {
    const markup = viewMarkup(<DiffFile {...diffFile()} />)

    expect(markup).toContain("View file")
    expect(markup).not.toContain('aria-label="Delete comment"')
  })

  it("can show a saved comment with a button that deletes it", () => {
    const markup = viewMarkup(<DiffFile {...diffFile({ comments: [makeComment({ text: "Why this value?" })] })} />)

    expect(markup).toContain("Why this value?")
    expect(markup).toContain('aria-label="Delete comment"')
  })

  it("can open a comment box under the line the draft is on", () => {
    const markup = viewMarkup(<DiffFile {...diffFile({ draft: { path: "src/app.ts", side: "new", line: 2 } })} />)

    expect(markup).toContain('aria-label="Comment"')
  })
})
