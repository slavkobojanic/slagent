import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process"
import { createInterface } from "node:readline"
import { existsSync } from "node:fs"
import { desktopCapturer, systemPreferences } from "electron"

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

  private workerAccessibility = false
  private workerScreen = false

  constructor(private readonly executable: string) {}

  permissions(): Promise<ComputerPermissions> {
    const result = currentPermissions()
    this.noteTrust(result)
    return Promise.resolve(result)
  }

  requestAccessibility(): Promise<ComputerPermissions> {
    if (process.platform === "darwin" && !systemPreferences.isTrustedAccessibilityClient(false)) {
      systemPreferences.isTrustedAccessibilityClient(true)
    }
    return this.permissions()
  }

  async requestScreenRecording(): Promise<ComputerPermissions> {
    const current = currentPermissions()
    if (process.platform === "darwin" && !current.screenRecording) {
      await Promise.race([
        desktopCapturer.getSources({ types: ["screen"] }).catch(() => undefined),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ])
    }
    return this.permissions()
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
      if (this.child !== child) return
      this.child = null
      this.failAll("Computer use stopped.")
    })
  }

  private noteTrust(result: ComputerPermissions): void {
    const gainedAccessibility = result.accessibility && !this.workerAccessibility
    const gainedScreen = result.screenRecording && !this.workerScreen
    if (this.child && (gainedAccessibility || gainedScreen)) {
      if (this.pending.size > 0) return
      this.restartWorker()
    }
    this.workerAccessibility = result.accessibility
    this.workerScreen = result.screenRecording
  }

  private restartWorker(): void {
    const child = this.child
    if (!child) return
    this.child = null
    child.kill()
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

function currentPermissions(): ComputerPermissions {
  if (process.platform !== "darwin") {
    return { accessibility: true, screenRecording: true, error: null }
  }
  return {
    accessibility: systemPreferences.isTrustedAccessibilityClient(false),
    screenRecording: systemPreferences.getMediaAccessStatus("screen") === "granted",
    error: null,
  }
}

export function computerExecutable(appPath: string, resourcesPath: string): string {
  const name = "slagent.app/Contents/MacOS/slagent"
  const packaged = `${resourcesPath}/${name}`
  if (existsSync(packaged)) return packaged
  return `${appPath}/resources/${name}`
}
