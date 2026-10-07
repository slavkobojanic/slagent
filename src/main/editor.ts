import { stat } from "node:fs/promises"
import { isAbsolute, resolve } from "node:path"
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

// Returns false when the path is not a file in or under cwd, so callers can
// ignore inline code that only looks like a path.
export async function openInEditor(cwd: string, raw: string): Promise<boolean> {
  const target = parseTarget(raw)
  if (!target.path) return false
  let file = target.path
  if (file.startsWith("~/")) file = `${app.getPath("home")}${file.slice(1)}`
  if (!isAbsolute(file)) {
    if (!cwd) return false
    file = resolve(cwd, file)
  }
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
