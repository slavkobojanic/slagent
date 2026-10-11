import { spawn, type ChildProcess } from "node:child_process"
import { existsSync } from "node:fs"
import { join, relative } from "node:path"

// After the agent edits a file, the current tsserver diagnostics for it are
// appended to the tool result, so the agent sees the type errors of its own
// change without running tsc. Everything degrades to no diagnostics: no
// typescript in the project, a slow cold start, a crash — the tool result is
// never blocked or broken by this.

const DIAGNOSE_TIMEOUT_MS = 10_000
const MAX_DIAGNOSTICS = 20
const MAX_DIAGNOSTIC_CHARS = 4000

const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"])

export type TsDiagnostic = {
  severity: "error" | "warning"
  line: number
  column: number
  code: number
  text: string
}

type TsserverMessage = {
  seq?: number
  type: "request" | "response" | "event"
  command?: string
  event?: string
  request_seq?: number
  success?: boolean
  message?: string
  body?: unknown
  arguments?: unknown
}

type DiagnosticEventBody = {
  file?: string
  diagnostics?: {
    category?: string
    code?: number
    text?: string
    start?: { line?: number; offset?: number }
  }[]
}

type Completion = {
  requestSeq: number
  resolve: () => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

// The live connection to one project's tsserver. Diagnose cycles are
// serialized: open or reload the file, ask for errors, collect the diagnostic
// events until the request completes.
class Tsserver {
  readonly child: ChildProcess
  private buffer = Buffer.alloc(0)
  private nextSeq = 1
  private queue: Promise<unknown> = Promise.resolve()
  private completion: Completion | null = null
  private collected: TsDiagnostic[] = []
  private collectingFile: string | null = null
  private opened = new Set<string>()
  private exited = false

  constructor(
    script: string,
    private readonly cwd: string,
    onExit: () => void,
  ) {
    this.child = spawn(
      process.execPath,
      [script, "--disableAutomaticTypingAcquisition", "--disableTelemetry", "--useInferredProjectPerProjectRoot"],
      {
        cwd,
        env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
        stdio: ["pipe", "pipe", "pipe"],
      },
    )
    this.child.stdout!.on("data", (chunk: Buffer) => this.receive(chunk))
    this.child.on("exit", () => {
      this.exited = true
      this.failCompletion(new Error("tsserver exited"))
      onExit()
    })
  }

  get dead(): boolean {
    return this.exited
  }

  diagnose(file: string): Promise<TsDiagnostic[]> {
    const run = this.queue.then(() => this.runCycle(file))
    this.queue = run.catch(() => undefined)
    return run
  }

  stop(): void {
    this.exited = true
    this.failCompletion(new Error("tsserver stopped"))
    this.child.kill()
  }

  private async runCycle(file: string): Promise<TsDiagnostic[]> {
    if (!this.opened.has(file)) {
      this.opened.add(file)
      this.send({ type: "request", command: "open", arguments: { file, projectRootPath: this.cwd } })
    } else {
      // The edit tools write to disk, so tsserver's copy of the file is stale.
      this.send({ type: "request", command: "reload", arguments: { file } })
    }
    this.collected = []
    this.collectingFile = file
    const requestSeq = this.send({ type: "request", command: "geterr", arguments: { files: [file], delay: 0 } })
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("tsserver diagnostics timed out")), DIAGNOSE_TIMEOUT_MS)
      this.completion = { requestSeq, resolve, reject, timer }
    })
    return this.collected
  }

  private send(message: TsserverMessage): number {
    const seq = this.nextSeq++
    // tsserver reads newline-delimited JSON even though it writes framed messages.
    this.child.stdin!.write(`${JSON.stringify({ ...message, seq })}\n`)
    return seq
  }

  private receive(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk])
    for (;;) {
      const headerEnd = this.buffer.indexOf("\r\n\r\n")
      if (headerEnd === -1) return
      const header = this.buffer.subarray(0, headerEnd).toString("utf8")
      const length = Number(/Content-Length: (\d+)/.exec(header)?.[1])
      if (!Number.isFinite(length) || headerEnd + 4 + length > this.buffer.length) return
      const payload = this.buffer.subarray(headerEnd + 4, headerEnd + 4 + length).toString("utf8")
      this.buffer = this.buffer.subarray(headerEnd + 4 + length)
      try {
        this.handle(JSON.parse(payload) as TsserverMessage)
      } catch {
        // A malformed frame is skipped; the connection stays usable.
      }
    }
  }

  private handle(message: TsserverMessage): void {
    if (message.type === "response" && message.success === false) {
      this.failCompletion(new Error(message.message || "tsserver request failed"))
      return
    }
    if (message.type === "event") {
      if (message.event === "requestCompleted" && message.body !== null && typeof message.body === "object") {
        const requestSeq = (message.body as { request_seq?: number }).request_seq
        if (requestSeq === this.completion?.requestSeq) this.finishCompletion()
        return
      }
      if ((message.event === "syntaxDiag" || message.event === "semanticDiag") && this.collectingFile) {
        const body = message.body as DiagnosticEventBody | undefined
        if (body?.file !== this.collectingFile || !Array.isArray(body.diagnostics)) return
        for (const diagnostic of body.diagnostics) {
          if (diagnostic.category !== "error" && diagnostic.category !== "warning") continue
          this.collected.push({
            severity: diagnostic.category,
            line: diagnostic.start?.line ?? 0,
            column: diagnostic.start?.offset ?? 0,
            code: diagnostic.code ?? 0,
            text: (diagnostic.text ?? "").slice(0, 300),
          })
        }
      }
    }
  }

  private finishCompletion(): void {
    const completion = this.completion
    this.completion = null
    if (completion) {
      clearTimeout(completion.timer)
      completion.resolve()
    }
  }

  private failCompletion(error: Error): void {
    const completion = this.completion
    this.completion = null
    if (completion) {
      clearTimeout(completion.timer)
      completion.reject(error)
    }
  }
}

export class DiagnosticsService {
  private servers = new Map<string, Tsserver>()

  async diagnose(cwd: string, absolutePath: string): Promise<TsDiagnostic[]> {
    if (!diagnosable(absolutePath)) return []
    const script = tsserverScript(cwd)
    if (!script) return []
    let server = this.servers.get(cwd)
    if (server?.dead) {
      this.servers.delete(cwd)
      server = undefined
    }
    if (!server) {
      server = new Tsserver(script, cwd, () => {
        if (this.servers.get(cwd) === server) this.servers.delete(cwd)
      })
      this.servers.set(cwd, server)
    }
    try {
      return await server.diagnose(absolutePath)
    } catch {
      return []
    }
  }

  stop(cwd: string): void {
    this.servers.get(cwd)?.stop()
    this.servers.delete(cwd)
  }

  stopAll(): void {
    for (const [cwd] of this.servers) this.stop(cwd)
  }
}

// One service per app process, shared by the Pi extension and the Claude hooks.
export const diagnostics = new DiagnosticsService()

function diagnosable(path: string): boolean {
  return CODE_EXTENSIONS.has(path.slice(path.lastIndexOf(".")).toLowerCase())
}

// Only the project's own typescript is used, so diagnostics respect the
// project's TS version. A project without typescript in node_modules gets no
// diagnostics rather than a stale bundled copy.
function tsserverScript(cwd: string): string | null {
  const script = join(cwd, "node_modules", "typescript", "lib", "tsserver.js")
  return existsSync(script) ? script : null
}

export function formatDiagnostics(cwd: string, absolutePath: string, found: TsDiagnostic[]): string {
  const shown = found.slice(0, MAX_DIAGNOSTICS)
  const lines = shown.map((diagnostic) => {
    const position = diagnostic.line > 0 ? `${diagnostic.line}:${diagnostic.column} ` : ""
    return `  - ${position}${diagnostic.severity} TS${diagnostic.code}: ${diagnostic.text}`
  })
  if (found.length > shown.length) lines.push(`  - ...and ${found.length - shown.length} more`)
  let body = `tsserver found ${found.length} problem${found.length === 1 ? "" : "s"} in ${relative(cwd, absolutePath) || absolutePath} after your change:\n${lines.join("\n")}`
  if (body.length > MAX_DIAGNOSTIC_CHARS) body = body.slice(0, MAX_DIAGNOSTIC_CHARS) + "\n  - ...truncated"
  return `${body}\nFix the ones caused by your change before finishing; ignore pre-existing ones you did not touch.`
}
