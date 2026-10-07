import { describe, expect, it, vi } from "vitest"
import { viewMarkup } from "@/test/view-markup"
import { DiffFooter, type DiffFooterProps } from "@/features/changes/diff-panel/diff-footer"

function footer(overrides: Partial<DiffFooterProps> = {}): DiffFooterProps {
  return {
    message: "",
    placeholder: "Commit message for 2 files",
    canEditMessage: true,
    canWriteMessage: true,
    writingMessage: false,
    canCommit: false,
    canPublish: true,
    pushLabel: "Push",
    onMessageChange: vi.fn(),
    onCommitShortcut: vi.fn(),
    onWriteMessage: vi.fn(),
    onCommit: vi.fn(),
    onPush: vi.fn(),
    onOpenPr: vi.fn(),
    ...overrides,
  }
}

// The opening tag of the element that holds `needle`, so a test checks that element's own attributes.
function openingTag(markup: string, needle: string): string {
  const at = markup.indexOf(needle)
  const start = markup.lastIndexOf("<", at)
  return markup.slice(start, markup.indexOf(">", at) + 1)
}

describe("DiffFooter", () => {
  it("can show a commit box that is ready to commit", () => {
    const markup = viewMarkup(<DiffFooter {...footer({ message: "Fix the parser", canCommit: true, pushLabel: "Push 2" })} />)

    expect(markup).toContain("Fix the parser")
    expect(markup).toContain(">Push 2<")
    expect(openingTag(markup, ">Commit all<")).not.toContain('disabled=""')
    expect(openingTag(markup, ">Push 2<")).not.toContain('disabled=""')
  })

  it("can disable the commit box and its buttons when nothing changed", () => {
    const markup = viewMarkup(
      <DiffFooter {...footer({ placeholder: "Nothing to commit", canEditMessage: false, canWriteMessage: false, canPublish: false })} />,
    )

    expect(markup).toContain('placeholder="Nothing to commit"')
    expect(openingTag(markup, 'aria-label="Commit message"')).toContain('disabled=""')
    expect(openingTag(markup, 'aria-label="Write a commit message"')).toContain('disabled=""')
    expect(openingTag(markup, ">Open PR<")).toContain('disabled=""')
  })

  it("can animate the write-message button while a message is being written", () => {
    const markup = viewMarkup(<DiffFooter {...footer({ canWriteMessage: false, writingMessage: true })} />)

    expect(markup).toContain("animate-pulse")
  })
})
