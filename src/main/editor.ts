import { open, stat } from "node:fs/promises"
import { isAbsolute, relative, resolve, sep } from "node:path"
import type { FileView } from "../shared/types"
import { app, shell } from "electron"

// Editors that open file:line from a URL. The first one installed wins.
const EDITORS = [
  { scheme: "cursor", url: (file: string, line: number) => `cursor://file${file}:${line}` },
  { scheme: "vscode", url: (file: string, line: number) => `vscode://file${file}:${line}` },
  { scheme: "windsurf", url: (file: string, line: number) => `windsurf://file${file}:${line}` },
  { scheme: "zed", url: (file: string, line: number) => `zed://file${file}:${line}` },
]

export type EditorTarget = {
  path: string
  line?: number
}

export function parseTarget(raw: string): EditorTarget {
  let path = raw.trim()
  if (path.startsWith("file://")) path = decodeURIComponent(new URL(path).pathname)
  const match = /^(.*?):(\d+)(?::\d+)?$/.exec(path)
  if (!match) return { path }
  return { path: match[1] ?? path, line: Number(match[2]) }
}

const VIEW_LIMIT = 2 * 1024 * 1024

function resolveTarget(cwd: string, path: string): string | null {
  let file = path
  if (file.startsWith("~/")) file = `${app.getPath("home")}${file.slice(1)}`
  if (isAbsolute(file)) return file
  if (!cwd) return null
  return resolve(cwd, file)
}

// Reads a file for the viewer. Returns null when the path is not a file, so
// inline code that only looks like a path does nothing.
export async function readFileView(cwd: string, raw: string): Promise<FileView | null> {
  const target = parseTarget(raw)
  if (!target.path) return null
  const file = resolveTarget(cwd, target.path)
  if (!file) return null
  let size = 0
  try {
    const info = await stat(file)
    if (!info.isFile()) return null
    size = info.size
  } catch {
    return null
  }
  const handle = await open(file, "r")
  let bytes: Buffer
  try {
    const length = Math.min(size, VIEW_LIMIT)
    bytes = Buffer.alloc(length)
    await handle.read(bytes, 0, length, 0)
  } finally {
    await handle.close()
  }
  const binary = bytes.subarray(0, 8000).includes(0)
  let display = file
  const root = cwd ? resolve(cwd) : ""
  if (root && (file === root || file.startsWith(`${root}${sep}`))) display = relative(root, file)
  return {
    path: display,
    absolutePath: file,
    line: target.line ?? null,
    contents: binary ? "" : bytes.toString("utf8"),
    size,
    binary,
    truncated: size > VIEW_LIMIT,
  }
}

// Returns false when the path is not a file in or under cwd, so callers can
// ignore inline code that only looks like a path.
export async function openInEditor(cwd: string, raw: string): Promise<boolean> {
  const target = parseTarget(raw)
  if (!target.path) return false
  const file = resolveTarget(cwd, target.path)
  if (!file) return false
  try {
    const info = await stat(file)
    if (!info.isFile() && !info.isDirectory()) return false
  } catch {
    return false
  }
  const line = target.line ?? 1
  for (const editor of EDITORS) {
    if (!app.getApplicationNameForProtocol(`${editor.scheme}://`)) continue
    await shell.openExternal(editor.url(file, line))
    return true
  }
  const error = await shell.openPath(file)
  return !error
}
