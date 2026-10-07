import { describe, expect, it, vi } from "vitest"
import { viewMarkup } from "@/test/view-markup"
import { CommitMessage, type CommitMessageProps } from "./commit-message"

function box(overrides: Partial<CommitMessageProps> = {}): CommitMessageProps {
  return {
    message: "",
    placeholder: "Commit message for 2 files",
    canEditMessage: true,
    canWriteMessage: true,
    writingMessage: false,
    onMessageChange: vi.fn(),
    onCommitShortcut: vi.fn(),
    onWriteMessage: vi.fn(),
    ...overrides,
  }
}

function openingTag(markup: string, needle: string): string {
  const at = markup.indexOf(needle)
  const start = markup.lastIndexOf("<", at)
  return markup.slice(start, markup.indexOf(">", at) + 1)
}

describe("CommitMessage", () => {
  it("can show the message being typed", () => {
    const markup = viewMarkup(<CommitMessage {...box({ message: "Fix the parser" })} />)

    expect(markup).toContain("Fix the parser")
    expect(openingTag(markup, 'aria-label="Commit message"')).not.toContain('disabled=""')
  })

  it("can disable the message box and the write button when nothing changed", () => {
    const markup = viewMarkup(<CommitMessage {...box({ placeholder: "Nothing to commit", canEditMessage: false, canWriteMessage: false })} />)

    expect(markup).toContain('placeholder="Nothing to commit"')
    expect(openingTag(markup, 'aria-label="Commit message"')).toContain('disabled=""')
    expect(openingTag(markup, 'aria-label="Write a commit message"')).toContain('disabled=""')
  })

  it("can animate the write-message button while a message is being written", () => {
    const markup = viewMarkup(<CommitMessage {...box({ canWriteMessage: false, writingMessage: true })} />)

    expect(markup).toContain("animate-pulse")
  })
})
