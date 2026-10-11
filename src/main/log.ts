import { appendFile, copyFile, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import { createServer as createNetServer, type Server } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { shell } from "electron"

const MAX_BYTES = 2 * 1024 * 1024
const KEEP_BYTES = 1024 * 1024

type Line = { when: string; level: string; scope: string; event: string; data: Record<string, unknown> | null }

export type Log = {
  info(scope: string, event: string, data?: Record<string, unknown>): void
  warn(scope: string, event: string, data?: Record<string, unknown>): void
  error(scope: string, event: string, data?: Record<string, unknown>): void
}

type ProcessLogDeps = {
  logPath: string
  writeLine: (line: string) => void
  append?: (path: string, data: string) => Promise<void>
  statFile?: (path: string) => Promise<{ size: number } | null>
  read?: (path: string) => Promise<string>
  write?: (path: string, data: string) => Promise<void>
  truncate?: (path: string, keepBytes: number) => Promise<void>
  now?: () => Date
}

export function createProcessLog(deps: ProcessLogDeps): Log {
  let queue: Promise<void> = Promise.resolve()
  const state = { bytes: 0, truncating: false, counted: false }
  const truncate = deps.truncate ?? truncateLogFile
  const append = deps.append ?? appendFile
  const statFile = deps.statFile ?? (async (path) => {
    const info = await stat(path).catch(() => null)
    return info?.isFile() ? { size: info.size } : null
  })
  const now = deps.now ?? (() => new Date())

  const push = (level: string, scope: string, event: string, data?: Record<string, unknown>) => {
    const line = JSON.stringify({ when: now().toISOString(), level, scope, event, data: data ?? null })
    deps.writeLine(line)
    queue = queue
      .then(async () => {
        try {
          if (!state.counted) {
            const info = await statFile(deps.logPath)
            state.bytes = info?.size ?? 0
            state.counted = true
          }
          await append(deps.logPath, `${line}\n`)
          state.bytes += line.length + 1
          if (state.bytes <= MAX_BYTES || state.truncating) return
          state.truncating = true
          await truncate(deps.logPath, KEEP_BYTES)
          state.bytes = 0
          state.counted = false
        } catch {
          state.bytes = 0
          state.counted = false
        } finally {
          state.truncating = false
        }
      })
      .catch(() => undefined)
  }

  return {
    info: (scope, event, data) => push("info", scope, event, data),
    warn: (scope, event, data) => push("warn", scope, event, data),
    error: (scope, event, data) => push("error", scope, event, data),
  }
}

// Drops the older half once the file grows past maxBytes, so it stays readable
// and bounded without losing the most recent output.
export async function truncateLogFile(path: string, keepBytes: number, deps: { read?: (path: string) => Promise<string>; write?: (path: string, data: string) => Promise<void> } = {}): Promise<void> {
  const read = deps.read ?? readFile
  const write = deps.write ?? writeFile
  const contents = await read(path)
  // Walk backwards from the end, keeping as many whole recent lines as the cap allows.
  const lines = contents.split("\n")
  const trailing = lines.length > 1 && lines[lines.length - 1] === "" ? lines.length - 1 : lines.length
  let total = 0
  let from = trailing
  while (from > 0) {
    const size = Buffer.byteLength(lines[from - 1] ?? "") + 1
    if (total > 0 && total + size > keepBytes) break
    total += size
    from -= 1
  }
  const kept = `${lines.slice(from, trailing).join("\n")}${trailing > from ? "\n" : ""}`
  await write(path, kept)
}

export function formatLogLines(contents: string): string {
  const lines: string[] = []
  for (const raw of contents.split("\n")) {
    if (!raw) continue
    let line: Line | null = null
    try {
      const parsed: unknown = JSON.parse(raw)
      if (parsed !== null && typeof parsed === "object" && "when" in parsed && "level" in parsed) line = parsed as Line
    } catch {
      // Fall through to the raw line.
    }
    lines.push(line ? `${line.when} ${line.level} ${line.scope} ${line.event}${formatData(line.data)}` : raw)
  }
  return lines.join("\n")
}

function formatData(data: Record<string, unknown> | null): string {
  if (data === null) return ""
  const keys = Object.keys(data)
  if (keys.length === 0) return ""
  return ` ${JSON.stringify(data)}`
}

export function timestampSlug(now: Date): string {
  const pad = (part: number) => String(part).padStart(2, "0")
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
}

export type BundleResult = { archivePath: string; files: string[] } | { error: string }

export type BundleDeps = {
  userData: string
  appVersion: string
  platform: string
  now?: () => Date
  copy?: typeof copyFile
  writeFile?: typeof writeFile
  mkdir?: typeof mkdir
  mkdtemp?: typeof mkdtemp
  rm?: typeof rm
  readdir?: typeof readdir
  stat?: typeof stat
}

export async function bundleLogs(deps: BundleDeps): Promise<BundleResult> {
  const readdirFn = deps.readdir ?? readdir
  const statFn = deps.stat ?? stat
  const now = deps.now ?? (() => new Date())
  const folder = join(tmpdir(), `slagent-logs-${timestampSlug(now())}`)
  try {
    const written = await copyLogFiles({ ...deps, readdir: readdirFn, stat: statFn, folder })
    const files = [...written.files, "versions.txt", "spindump-source-paths.txt"]
    await writeFile(join(folder, "versions.txt"), `slagent ${deps.appVersion}\n${deps.platform}\n${now().toISOString()}\n`)
    await writeFile(
      join(folder, "spindump-source-paths.txt"),
      [
        "To turn an unresponsive app into a spindump, run:",
        "",
        `pgrep -x slagent | head -1 | xargs -I{} spindump {} -notarget 5s -file ~/Desktop/slagent-spindump.txt`,
        "",
        "Log sources for the paths below (attach them to the report):",
        ...written.paths.map((path) => `${path} -> ${path.replace(/[^a-zA-Z0-9._/-]/g, "_")}`),
        "",
        "The frames never appear here because Electron's renderer logs go to the",
        "DevTools console; if you suspect a hang, take the spindump from a terminal.",
      ].join("\n"),
    )
    await shell.showItemInFolder(folder)
    return { archivePath: folder, files }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

async function copyLogFiles(
  deps: BundleDeps & { folder: string; readdir: typeof readdir; stat: typeof stat },
): Promise<{ files: string[]; paths: string[] }> {
  const copy = deps.copy ?? copyFile
  const names: string[] = []
  const paths: string[] = []
  const topLevel = await readdirFn(deps.userData, { withFileTypes: true })
  for (const entry of topLevel) {
    if (!entry.name.endsWith(".log")) continue
    const from = join(deps.userData, entry.name)
    await copy(from, join(deps.folder, entry.name))
    names.push(entry.name)
    paths.push(from)
  }
  const vscodeDir = join(deps.userData, "vscode-server")
  const entries = await readdirFn(vscodeDir, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    if (!entry.name.endsWith(".log")) continue
    const from = join(vscodeDir, entry.name)
    await copy(from, join(deps.folder, `vscode-server-${entry.name}`))
    names.push(`vscode-server-${entry.name}`)
    paths.push(from)
  }
  return { files: names, paths }
}

export type LogPaths = { userData: string; logPath: string; vscodeDir: string }

export function logPaths(userData: string): LogPaths {
  return { userData, logPath: join(userData, "app.log"), vscodeDir: join(userData, "vscode-server") }
}

export function logBytesAtLeast(bytes: number) {
  return async (path: string): Promise<boolean> => {
    const info = await stat(path).catch(() => null)
    return info !== null && info.isFile() && info.size >= bytes
  }
}

export type WaitForFileDeps = {
  logPath: string
  exists?: (path: string) => Promise<boolean>
  delay?: (ms: number) => Promise<void>
  timeoutMs?: number
}

// The workbench can take a while to start; wait for its first write.
export async function waitForFile(deps: WaitForFileDeps): Promise<boolean> {
  const exists = deps.exists ?? ((path) => stat(path).then((info) => info.isFile()).catch(() => false))
  const delay = deps.delay ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
  const deadline = Date.now() + (deps.timeoutMs ?? 20_000)
  for (;;) {
    if (await exists(deps.logPath)) return true
    if (Date.now() > deadline) return false
    await delay(100)
  }
}

export type WatchTarget = { child: { pid?: number }; onData: (chunk: string) => void }

// The editor server writes to its stdout, so the app copies those lines into its own log.
export function watchEditorProcess(target: WatchTarget): void {
  target.onData(`${JSON.stringify({ when: new Date().toISOString(), level: "info", scope: "vscode-server", event: `pid ${target.child.pid ?? "?"}` })}\n`)
}

export type MenuTarget = { window: { showItemInFolder: (path: string) => void } | null; bundle: () => Promise<BundleResult> }

export async function saveLogsFromMenu(target: MenuTarget): Promise<void> {
  const result = await target.bundle()
  if ("error" in result) return
  target.window?.showItemInFolder(result.archivePath)
}

export type NetServerDeps = {
  port: number
  onLine: (line: string) => void
  createServer?: typeof createNetServer
}

export type NetLogger = { server: Server; close: () => Promise<void> }

// A tiny line-socket sink, so a crashed renderer can still be captured by the main process.
export function startNetLogger(deps: NetServerDeps): Promise<NetLogger> {
  const createServer = deps.createServer ?? createNetServer
  return new Promise((resolve, reject) => {
    const server = createServer((socket) => {
      socket.setEncoding("utf8")
      socket.on("data", (chunk: string) => deps.onLine(chunk))
    })
    server.once("error", reject)
    server.listen(deps.port, "127.0.0.1", () => resolve({ server, close: () => new Promise((r) => server.close(() => r())) }))
  })
}
