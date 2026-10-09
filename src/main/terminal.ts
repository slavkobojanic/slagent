import { chmodSync, existsSync, statSync } from "node:fs"
import { createRequire } from "node:module"
import { homedir } from "node:os"
import { basename, dirname, join } from "node:path"
import { spawn, type IPty } from "node-pty"
import type { TerminalEvent, TerminalSession } from "../shared/types"
import { importShellPath } from "./shell-env"

// Output and exit callbacks a background task's terminal reports to.
export type TaskSink = {
  onData: (chunk: string) => void
  onExit: (exitCode: number, signal: string | null) => void
}

const require = createRequire(import.meta.url)

export class TerminalManager {
  private readonly shells = new Map<string, IPty>()
  private counter = 0

  constructor(
    private readonly emit: (event: TerminalEvent) => void,
    private readonly cwd: () => string,
  ) {
    this.fixHelperPermissions()
  }

  async create(): Promise<TerminalSession> {
    const shell = process.env.SHELL || "/bin/zsh"
    const folder = this.cwd()
    const cwd = folder && existsSync(folder) ? folder : homedir()
    const id = `terminal-${(this.counter += 1)}`
    const term = spawn(shell, ["-l"], {
      name: "xterm-256color",
      cols: 80,
      rows: 24,
      cwd,
      env: await this.shellEnv(),
    })
    this.shells.set(id, term)
    term.onData((data) => this.emit({ type: "data", id, data }))
    term.onExit(({ exitCode }) => {
      this.shells.delete(id)
      this.emit({ type: "exit", id, exitCode })
    })
    return { id, title: basename(shell), cwd }
  }

  write(id: string, data: string): void {
    this.shells.get(id)?.write(data)
  }

  // A terminal for an agent's background task, such as a dev server. It is a
  // real pty, so the user can open it in the drawer and even type into it,
  // while the task's output is buffered for the agent elsewhere.
  async createTask(command: string, sink: TaskSink, cwdOverride?: string): Promise<TerminalSession> {
    const shell = process.env.SHELL || "/bin/zsh"
    const folder = cwdOverride && existsSync(cwdOverride) ? cwdOverride : this.cwd()
    const cwd = folder && existsSync(folder) ? folder : homedir()
    const id = `task-${(this.counter += 1)}`
    const term = spawn(shell, ["-lc", command], {
      name: "xterm-256color",
      cols: 80,
      rows: 24,
      cwd,
      env: await this.shellEnv(),
    })
    this.shells.set(id, term)
    term.onData((data) => {
      sink.onData(data)
      this.emit({ type: "data", id, data })
    })
    term.onExit(({ exitCode }) => {
      this.shells.delete(id)
      sink.onExit(exitCode, null)
      this.emit({ type: "exit", id, exitCode })
    })
    return { id, title: command.slice(0, 60), cwd }
  }

  // Stops a background task and everything it started, its process group.
  stopTask(id: string): void {
    const term = this.shells.get(id)
    if (!term) return
    const pid = term.pid
    if (pid) {
      try {
        process.kill(-pid, "SIGTERM")
      } catch {
        term.kill()
      }
      setTimeout(() => {
        try {
          process.kill(-pid, "SIGKILL")
        } catch {
          // Already gone.
        }
      }, 3000)
      return
    }
    term.kill()
  }

  resize(id: string, cols: number, rows: number): void {
    if (cols < 1 || rows < 1) return
    const term = this.shells.get(id)
    if (!term) return
    term.resize(cols, rows)
  }

  close(id: string): void {
    this.shells.get(id)?.kill()
  }

  stop(): void {
    for (const term of this.shells.values()) term.kill()
    this.shells.clear()
  }

  // The prebuild ships spawn-helper without the execute bit, so pty.spawn dies
  // with "posix_spawnp failed". Set it before the first shell starts.
  private fixHelperPermissions(): void {
    if (process.platform === "win32") return
    try {
      const helper = join(dirname(require.resolve("node-pty")), "..", "prebuilds", `${process.platform}-${process.arch}`, "spawn-helper")
        .replace("app.asar", "app.asar.unpacked")
      if (statSync(helper).mode & 0o111) return
      chmodSync(helper, 0o755)
    } catch (error) {
      console.error("terminal spawn-helper:", error)
    }
  }

  private async shellEnv(): Promise<Record<string, string>> {
    const path = await importShellPath()
    const env: Record<string, string> = {}
    for (const [name, value] of Object.entries(process.env)) {
      if (value === undefined || name === "ELECTRON_RUN_AS_NODE") continue
      env[name] = value
    }
    env.SHELL = env.SHELL || "/bin/zsh"
    env.TERM = "xterm-256color"
    env.COLORTERM = "truecolor"
    env.TERM_PROGRAM = "slagent"
    if (path) env.PATH = path
    return env
  }
}
