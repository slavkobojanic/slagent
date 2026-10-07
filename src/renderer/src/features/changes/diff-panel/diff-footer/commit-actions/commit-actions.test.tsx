import { describe, expect, it, vi } from "vitest"
import { viewMarkup } from "@/test/view-markup"
import { CommitActions, type CommitActionsProps } from "./commit-actions"

function actions(overrides: Partial<CommitActionsProps> = {}): CommitActionsProps {
  return {
    canCommit: false,
    canPublish: true,
    pushLabel: "Push",
    onCommit: vi.fn(),
    onPush: vi.fn(),
    onOpenPr: vi.fn(),
    ...overrides,
  }
}

function openingTag(markup: string, needle: string): string {
  const at = markup.indexOf(needle)
  const start = markup.lastIndexOf("<", at)
  return markup.slice(start, markup.indexOf(">", at) + 1)
}

describe("CommitActions", () => {
  it("can enable commit and push when ready", () => {
    const markup = viewMarkup(<CommitActions {...actions({ canCommit: true, pushLabel: "Push 2" })} />)

    expect(markup).toContain(">Push 2<")
    expect(openingTag(markup, ">Commit all<")).not.toContain('disabled=""')
    expect(openingTag(markup, ">Push 2<")).not.toContain('disabled=""')
  })

  it("can disable commit, push and Open PR when nothing can run", () => {
    const markup = viewMarkup(<CommitActions {...actions({ canPublish: false })} />)

    expect(openingTag(markup, ">Commit all<")).toContain('disabled=""')
    expect(openingTag(markup, ">Push<")).toContain('disabled=""')
    expect(openingTag(markup, ">Open PR<")).toContain('disabled=""')
  })
})
