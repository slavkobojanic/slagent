import { execFile } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdir, rm, writeFile } from "node:fs/promises"
import { join, resolve, sep } from "node:path"

// Snapshots of the project folder kept in a separate git directory, so they
// work in folders that are not git repos and never touch the project's own
// history. The project's .gitignore files still apply.

const EXCLUDES = [
  ".git",
  "node_modules",
  ".pnpm-store",
  "dist",
  "out",
  "build",
  ".next",
  ".nuxt",
  ".turbo",
  ".cache",
  "coverage",
  ".venv",
  "venv",
  "__pycache__",
  "target",
  "DerivedData",
  "Pods",
  ".DS_Store",
]

const AUTHOR = {
  GIT_AUTHOR_NAME: "slagent",
  GIT_AUTHOR_EMAIL: "slagent@localhost",
  GIT_COMMITTER_NAME: "slagent",
  GIT_COMMITTER_EMAIL: "slagent@localhost",
}

export class CheckpointStore {
  private ready: Promise<boolean> | null = null
  private tail: Promise<unknown> = Promise.resolve()

  constructor(
    private readonly cwd: string,
    private readonly gitDir: string,
  ) {}

  // Returns the snapshot commit, or null when git is missing or the folder is
  // too big to snapshot quickly.
  snapshot(label: string): Promise<string | null> {
    return this.serial(async () => {
      if (!(await this.init())) return null
      try {
        return await this.commit(label)
      } catch {
        return null
      }
    })
  }

  // Puts the folder back the way it was at the snapshot: changed and deleted
  // files come back and files created since are removed. Returns a snapshot of
  // the state just before, so the restore can be undone.
  restore(commit: string): Promise<string> {
    return this.serial(async () => {
      if (!(await this.init())) throw new Error("Checkpoints need git.")
      const before = await this.commit("before restore")
      const added = await this.git(["diff", "--name-only", "-z", "--no-renames", "--diff-filter=A", commit, before])
      const root = resolve(this.cwd)
      for (const file of added.split("\0").filter(Boolean)) {
        const target = resolve(root, file)
        if (!target.startsWith(`${root}${sep}`)) continue
        await rm(target, { force: true })
      }
      await this.git(["checkout", commit, "--", "."])
      return before
    })
  }

  // Everything that changed in the folder since the snapshot, as a unified diff.
  diff(commit: string): Promise<string> {
    return this.serial(async () => {
      if (!(await this.init())) return ""
      const now = await this.commit("diff")
      return this.git(["-c", "core.quotepath=off", "diff", "--no-color", "--no-ext-diff", commit, now])
    })
  }

  private async commit(label: string): Promise<string> {
    await this.git(["add", "-A", "--ignore-errors", "."], 60_000).catch(() => undefined)
    const tree = (await this.git(["write-tree"])).trim()
    const head = (await this.git(["rev-parse", "--verify", "-q", "HEAD"]).catch(() => "")).trim()
    if (head) {
      const headTree = (await this.git(["rev-parse", `${head}^{tree}`])).trim()
      if (headTree === tree) return head
    }
    const args = ["commit-tree", tree, "-m", label]
    if (head) args.push("-p", head)
    const commit = (await this.git(args)).trim()
    await this.git(["update-ref", "HEAD", commit])
    return commit
  }

  private init(): Promise<boolean> {
    if (!this.ready) {
      this.ready = (async () => {
        try {
          if (!existsSync(join(this.gitDir, "HEAD"))) {
            await mkdir(this.gitDir, { recursive: true })
            await run(["init", "-q", "--bare", this.gitDir], this.cwd)
            await this.git(["config", "core.bare", "false"])
            await this.git(["config", "core.autocrlf", "false"])
            await this.git(["config", "gc.auto", "0"])
          }
          await mkdir(join(this.gitDir, "info"), { recursive: true })
          await writeFile(join(this.gitDir, "info", "exclude"), `${EXCLUDES.map((name) => `/${name}\n${name}/`).join("\n")}\n`)
          return true
        } catch {
          return false
        }
      })()
    }
    return this.ready
  }

  private git(args: string[], timeout = 30_000): Promise<string> {
    return run(["--git-dir", this.gitDir, "--work-tree", this.cwd, ...args], this.cwd, timeout)
  }

  private serial<T>(task: () => Promise<T>): Promise<T> {
    const next = this.tail.then(task, task)
    this.tail = next.catch(() => undefined)
    return next
  }
}

function run(args: string[], cwd: string, timeout = 30_000): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    execFile(
      "git",
      args,
      { cwd, timeout, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, ...AUTHOR, GIT_TERMINAL_PROMPT: "0" } },
      (error, stdout) => {
        if (error) reject(error)
        else resolvePromise(stdout)
      },
    )
  })
}
