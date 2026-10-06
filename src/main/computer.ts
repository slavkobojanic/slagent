import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process"
import { createInterface } from "node:readline"
import { existsSync } from "node:fs"

export type ComputerPermissions = {
  accessibility: boolean
  screenRecording: boolean
  error: string | null
}

type Pending = {
  resolve: (value: Record<string, unknown>) => void
  reject: (error: Error) => void
}

export class ComputerUse {
  private child: ChildProcessWithoutNullStreams | null = null
  private nextId = 0
  private pending = new Map<string, Pending>()

  constructor(private readonly executable: string) {}

  permissions(): Promise<ComputerPermissions> {
    return this.call("permissions").then(readPermissions)
  }

  requestAccessibility(): Promise<ComputerPermissions> {
    return this.call("request_accessibility").then(readPermissions)
  }

  requestScreenRecording(): Promise<ComputerPermissions> {
    return this.call("request_screen_recording").then(readPermissions)
  }

  call(method: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    this.ensure()
    const child = this.child
    if (!child) return Promise.reject(new Error(this.missingMessage()))

    const id = String(this.nextId)
    this.nextId += 1
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      child.stdin.write(`${JSON.stringify({ id, method, params })}\n`)
    })
  }

  stop(): void {
    this.child?.kill()
    this.child = null
    for (const pending of this.pending.values()) pending.reject(new Error("Computer use stopped."))
    this.pending.clear()
  }

  private ensure(): void {
    if (this.child && !this.child.killed) return
    if (!existsSync(this.executable)) {
      this.failAll(this.missingMessage())
      return
    }
    const child = spawn(this.executable, [], { stdio: ["pipe", "pipe", "pipe"] })
    this.child = child
    const lines = createInterface({ input: child.stdout })
    lines.on("line", (line) => this.receive(line))
    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString().trim()
      if (text) console.error("computer-use", text)
    })
    child.on("exit", () => {
      if (this.child === child) this.child = null
      this.failAll("Computer use stopped.")
    })
  }

  private receive(line: string): void {
    let message: { id?: unknown; ok?: unknown; result?: unknown; error?: unknown }
    try {
      message = JSON.parse(line) as { id?: unknown; ok?: unknown; result?: unknown; error?: unknown }
    } catch {
      return
    }
    const id = String(message.id ?? "")
    const pending = this.pending.get(id)
    if (!pending) return
    this.pending.delete(id)
    if (message.ok === true && typeof message.result === "object" && message.result) {
      pending.resolve(message.result as Record<string, unknown>)
      return
    }
    const error = typeof message.error === "string" ? message.error : "Computer use failed."
    pending.reject(new Error(error))
  }

  private failAll(message: string): void {
    for (const pending of this.pending.values()) pending.reject(new Error(message))
    this.pending.clear()
  }

  private missingMessage(): string {
    return `Computer use is not built. Expected ${this.executable}`
  }
}

function readPermissions(result: Record<string, unknown>): ComputerPermissions {
  return {
    accessibility: result.accessibility === true,
    screenRecording: result.screenRecording === true,
    error: null,
  }
}

export function computerExecutable(appPath: string, resourcesPath: string): string {
  const name = "Slagent Computer.app/Contents/MacOS/slagent-computer"
  const packaged = `${resourcesPath}/${name}`
  if (existsSync(packaged)) return packaged
  return `${appPath}/resources/${name}`
}
