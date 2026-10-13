import { describe, expect, it } from "vitest"
import { isReadOnlyCommand } from "./plan-mode"

describe("isReadOnlyCommand", () => {
  it.each([
    "gh pr list",
    "gh pr view 123",
    "gh pr diff 123",
    "gh pr status",
    "gh search prs bug",
    "gh search issues bug",
    "gh repo view",
    "gh issue list",
    "gh run view 123",
    "git ls-remote origin",
    "glab mr list",
    "glab mr view 123",
    "glab mr diff 123",
  ])(
    "allows read-only GitHub CLI command %s",
    (command) => {
      expect(isReadOnlyCommand(command)).toBe(true)
    },
  )

  it.each([
    "gh pr create",
    "gh pr merge 123",
    "gh pr close 123",
    "gh repo delete",
    "gh auth login",
    "gh search code secret",
    "glab mr create",
    "glab mr merge 123",
  ])(
    "blocks GitHub CLI command that can change state: %s",
    (command) => {
      expect(isReadOnlyCommand(command)).toBe(false)
    },
  )

  it("blocks a read-only GitHub command chained with a write", () => {
    expect(isReadOnlyCommand("gh pr view 123 && gh pr merge 123")).toBe(false)
  })
})
