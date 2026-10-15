import { execFileSync } from "node:child_process"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { gitBranchLineChanges, parseBranchLineChanges } from "./git"

describe("parseBranchLineChanges", () => {
  it("maps additions and deletion anchors to current-file lines", () => {
    const diff = [
      "@@ -2,1 +2,1 @@",
      "-old value",
      "+new value",
      "@@ -7,2 +6,0 @@",
      "-removed one",
      "-removed two",
    ].join("\n")

    expect(parseBranchLineChanges(diff)).toEqual({ added: [2], removed: [6] })
  })

  it("gives additions precedence when a removal anchors to the same line", () => {
    const diff = ["@@ -3 +3 @@", "-before", "+after"].join("\n")

    expect(parseBranchLineChanges(diff)).toEqual({ added: [3], removed: [] })
  })

  it("gets changed lines for tracked and untracked branch files", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "slagent-branch-diff-"))
    const git = (...args: string[]) => execFileSync("git", ["-C", cwd, ...args], { stdio: "ignore" })
    try {
      git("init", "-b", "main")
      git("config", "user.name", "Test")
      git("config", "user.email", "test@example.com")
      await writeFile(join(cwd, "tracked.ts"), "one\ntwo\nthree\nfour\n")
      git("add", "tracked.ts")
      git("commit", "-m", "base")
      git("switch", "-c", "review-branch")
      await writeFile(join(cwd, "tracked.ts"), "one\nchanged\nthree\n")
      await writeFile(join(cwd, "new.ts"), "new one\nnew two\n")

      await expect(gitBranchLineChanges(cwd, join(cwd, "tracked.ts"))).resolves.toEqual({ added: [2], removed: [3] })
      await expect(gitBranchLineChanges(cwd, join(cwd, "new.ts"))).resolves.toEqual({ added: [1, 2], removed: [] })
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })
})
