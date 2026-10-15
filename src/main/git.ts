import { execFile } from "node:child_process"
import { delimiter, relative, resolve, sep } from "node:path"
import type { GitCommit, GitFile, GitStatus } from "../shared/types"

// Apps opened from the Dock get a bare PATH, so gh from Homebrew is not found
// unless the usual install folders are added.
const EXTRA_PATHS = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"]
const MAX_DIFF = 400_000

function env(): NodeJS.ProcessEnv {
  const parts = (process.env.PATH ?? "").split(delimiter).filter(Boolean)
  for (const extra of EXTRA_PATHS) if (!parts.includes(extra)) parts.push(extra)
  return { ...process.env, PATH: parts.join(delimiter), GIT_TERMINAL_PROMPT: "0", GH_PROMPT_DISABLED: "1" }
}

export function run(command: string, args: string[], cwd: string, timeout = 60_000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { cwd, timeout, maxBuffer: 64 * 1024 * 1024, env: env() }, (error, stdout, stderr) => {
      if (error) {
        const detail = String(stderr || stdout || "").trim()
        reject(new Error(detail || error.message))
        return
      }
      resolve(stdout)
    })
  })
}

function git(cwd: string, args: string[], timeout?: number): Promise<string> {
  return run("git", ["-c", "core.quotepath=off", ...args], cwd, timeout)
}

export async function gitStatus(cwd: string): Promise<GitStatus> {
  try {
    await git(cwd, ["rev-parse", "--is-inside-work-tree"])
  } catch {
    return { repo: false, branch: null, upstream: null, ahead: 0, behind: 0, files: [] }
  }
  const raw = await git(cwd, ["status", "--porcelain=v2", "--branch", "-z", "--untracked-files=all"])
  let branch: string | null = null
  let upstream: string | null = null
  let ahead = 0
  let behind = 0
  const files: GitFile[] = []
  const records = raw.split("\0")
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]
    if (!record) continue
    if (record.startsWith("# branch.head ")) {
      const head = record.slice("# branch.head ".length)
      if (head !== "(detached)") branch = head
      continue
    }
    if (record.startsWith("# branch.upstream ")) {
      upstream = record.slice("# branch.upstream ".length)
      continue
    }
    if (record.startsWith("# branch.ab ")) {
      const match = /\+(\d+) -(\d+)/.exec(record)
      ahead = Number(match?.[1] ?? 0)
      behind = Number(match?.[2] ?? 0)
      continue
    }
    if (record.startsWith("? ")) {
      files.push({ path: record.slice(2), status: "added", staged: false })
      continue
    }
    if (record.startsWith("1 ")) {
      const parts = record.split(" ")
      const xy = parts[1] ?? ".."
      files.push({ path: parts.slice(8).join(" "), status: statusFor(xy), staged: xy[0] !== "." })
      continue
    }
    if (record.startsWith("2 ")) {
      const parts = record.split(" ")
      const xy = parts[1] ?? ".."
      files.push({ path: parts.slice(9).join(" "), status: "renamed", staged: xy[0] !== "." })
      index += 1
      continue
    }
    if (record.startsWith("u ")) {
      const parts = record.split(" ")
      files.push({ path: parts.slice(10).join(" "), status: "conflict", staged: false })
    }
  }
  return { repo: true, branch, upstream, ahead, behind, files }
}

function statusFor(xy: string): GitFile["status"] {
  if (xy.includes("D")) return "deleted"
  if (xy.includes("A")) return "added"
  if (xy.includes("R")) return "renamed"
  return "modified"
}

// The working tree against HEAD, untracked files included, as one unified diff.
export async function gitDiff(cwd: string): Promise<string> {
  const status = await gitStatus(cwd)
  if (!status.repo) return ""
  let hasHead = true
  try {
    await git(cwd, ["rev-parse", "--verify", "-q", "HEAD"])
  } catch {
    hasHead = false
  }
  const parts: string[] = []
  if (hasHead) parts.push(await git(cwd, ["diff", "HEAD", "--no-color", "--no-ext-diff"]))
  else parts.push(await git(cwd, ["diff", "--cached", "--no-color", "--no-ext-diff"]))
  for (const file of status.files) {
    if (file.status !== "added" || file.staged) continue
    parts.push(await untrackedDiff(cwd, file.path))
  }
  return clip(parts.filter(Boolean).join("\n"))
}

async function untrackedDiff(cwd: string, path: string): Promise<string> {
  try {
    return await git(cwd, ["diff", "--no-index", "--no-color", "--", "/dev/null", path])
  } catch (error) {
    // git diff --no-index exits with 1 when files differ, which is always here.
    const message = error instanceof Error ? error.message : ""
    if (message.startsWith("diff --git")) return message
    return ""
  }
}

// The changes a single commit introduced, in the same shape as the working-tree diff.
export async function gitDiffCommit(cwd: string, sha: string): Promise<string> {
  return clip(await git(cwd, ["show", "--format=", "--no-color", "--no-ext-diff", sha]))
}

// Everything on the branch since it split from the main line, untracked files
// included, all the way to the current working tree.
export async function gitDiffBranch(cwd: string): Promise<string> {
  const base = await branchBase(cwd)
  const parts = [await git(cwd, ["diff", base, "--no-color", "--no-ext-diff"])]
  for (const file of (await gitStatus(cwd)).files) {
    if (file.status !== "added" || file.staged) continue
    parts.push(await untrackedDiff(cwd, file.path))
  }
  return clip(parts.filter(Boolean).join("\n"))
}

export type BranchLineChanges = { added: number[]; removed: number[] }

// Maps unified-diff changes to the current file's line numbers. Removed lines anchor to the
// insertion point in the new file; the editor lets additions take precedence at that line.
export function parseBranchLineChanges(diff: string): BranchLineChanges {
  const added = new Set<number>()
  const removed = new Set<number>()
  let newLine = 0
  let inHunk = false
  for (const line of diff.split("\n")) {
    if (line.startsWith("@@")) {
      const match = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line)
      newLine = Number(match?.[1] ?? 0)
      inHunk = true
      continue
    }
    if (!inHunk || line.startsWith("\\")) continue
    if (line.startsWith("+")) {
      added.add(newLine)
      newLine += 1
    } else if (line.startsWith("-")) {
      removed.add(Math.max(1, newLine))
    } else if (line.startsWith(" ")) {
      newLine += 1
    }
  }
  return { added: [...added], removed: [...removed].filter((line) => !added.has(line)) }
}

// Changed lines for one current file, including untracked files, for editor decorations.
export async function gitBranchLineChanges(cwd: string, filePath: string): Promise<BranchLineChanges> {
  const root = resolve(cwd)
  const relativePath = relative(root, resolve(root, filePath))
  if (!relativePath || relativePath === ".." || relativePath.startsWith(`..${sep}`)) return { added: [], removed: [] }
  const gitPath = relativePath.split(sep).join("/")
  const status = await gitStatus(cwd)
  if (!status.repo) return { added: [], removed: [] }
  const fileStatus = status.files.find((file) => file.path === gitPath)
  const diff = fileStatus?.status === "added" && !fileStatus.staged
    ? await untrackedDiff(cwd, gitPath)
    : await git(cwd, ["diff", await branchBase(cwd), "--no-color", "--no-ext-diff", "--unified=0", "--", `:(literal)${gitPath}`])
  return parseBranchLineChanges(diff)
}

async function branchBase(cwd: string): Promise<string> {
  for (const ref of ["main", "master", "origin/main", "origin/master"]) {
    try {
      return (await git(cwd, ["merge-base", "HEAD", ref])).trim()
    } catch {
      continue
    }
  }
  throw new Error("No main or master branch to compare against.")
}

// Recent commits for the diff panel's commit picker, newest first.
export async function gitLog(cwd: string, limit = 30): Promise<GitCommit[]> {
  const raw = await git(cwd, ["log", `--max-count=${limit}`, "--format=%H%x1f%s%x1f%cr"])
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha, subject, date] = line.split("\x1f")
      return { sha: sha ?? "", subject: subject ?? "", date: date ?? "" }
    })
}

export function clip(diff: string): string {
  if (diff.length <= MAX_DIFF) return diff
  return `${diff.slice(0, MAX_DIFF)}\n\n… diff truncated`
}

export async function gitCommit(cwd: string, message: string): Promise<string> {
  await git(cwd, ["add", "-A"])
  await git(cwd, ["commit", "-q", "-m", message])
  return (await git(cwd, ["rev-parse", "--short", "HEAD"])).trim()
}

export async function gitPush(cwd: string): Promise<void> {
  const status = await gitStatus(cwd)
  if (status.upstream) {
    await git(cwd, ["push"], 120_000)
    return
  }
  await git(cwd, ["push", "-u", "origin", "HEAD"], 120_000)
}

// Opens a pull request for the current branch with gh, filled from its
// commits, and returns its URL.
export async function createPullRequest(cwd: string): Promise<string> {
  await gitPush(cwd)
  try {
    const existing = await run("gh", ["pr", "view", "--json", "url", "-q", ".url"], cwd)
    if (existing.trim()) return existing.trim()
  } catch {
    // No pull request yet.
  }
  const output = await run("gh", ["pr", "create", "--fill"], cwd, 120_000)
  const url = output.split("\n").map((line) => line.trim()).find((line) => line.startsWith("https://"))
  if (!url) throw new Error(output.trim() || "gh did not return a pull request URL.")
  return url
}
