import { join } from "node:path"
import { app } from "electron"
import { createProcessLog, type Log } from "./log"

// The app's own log file. Everything the main process reports ends up here as
// JSON lines, mirrored to the terminal in development. The daemon has its own
// daemon.log with the same shape; both are bundled by Help > Save Logs.
export type AppLog = Log & {
  // Logs an Error (or anything thrown) with its message and stack.
  fail(scope: string, event: string, error: unknown, data?: Record<string, unknown>): void
}

let log: AppLog | null = null

export function appLog(): AppLog {
  if (log) return log
  let logPath = "app.log"
  try {
    logPath = join(app.getPath("userData"), "app.log")
  } catch {
    // Before ready, or under a test harness: console-only.
  }
  log = createAppLog({ logPath })
  return log
}

export function createAppLog(deps: { logPath: string; now?: () => Date }): AppLog {
  const inner = createProcessLog({
    logPath: deps.logPath,
    writeLine: (line) => mirror(line),
    now: deps.now,
  })
  return {
    info: inner.info,
    warn: inner.warn,
    error: inner.error,
    fail: (scope, event, error, data) => inner.error(scope, event, { ...data, ...errorData(error) }),
  }
}

// One console line per log entry, so the dev terminal still shows what is
// happening; the file keeps the structured record.
function mirror(line: string): void {
  const parsed = parse(line)
  const text = parsed ? `${parsed.scope}: ${parsed.event}${parsed.detail ? ` ${parsed.detail}` : ""}` : line
  const print = parsed?.level === "error" ? console.error : parsed?.level === "warn" ? console.warn : console.log
  print(text)
}

function parse(line: string): { level: string; scope: string; event: string; detail: string } | null {
  try {
    const entry = JSON.parse(line) as { level: string; scope: string; event: string; data: unknown }
    const detail = entry.data === null ? "" : JSON.stringify(entry.data)
    return { level: entry.level, scope: entry.scope, event: entry.event, detail }
  } catch {
    return null
  }
}

export function errorData(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const data: Record<string, unknown> = { message: error.message }
    if (error.stack) data.stack = error.stack
    return data
  }
  return { message: String(error) }
}
