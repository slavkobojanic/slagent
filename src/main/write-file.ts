import { realpath, stat, writeFile } from "node:fs/promises"
import { resolve, sep } from "node:path"
import type { WriteFileResult } from "../shared/types"

// Saves editor contents. Refuses anything outside the project and anything that
// changed on disk since the editor read it, so an external edit is never lost.
// Both paths are resolved through symlinks first: /tmp is /private/tmp on macOS, and a
// link inside the project must not lead the write out of it.
export async function writeProjectFile(cwd: string, file: string, contents: string, expectedMtime: number): Promise<WriteFileResult> {
  const outside: WriteFileResult = { ok: false, reason: "outside-project", message: "Only files inside the open project can be saved." }
  if (!cwd) return outside
  let root: string
  try {
    root = await realpath(resolve(cwd))
  } catch {
    return outside
  }
  let target: string
  try {
    target = await realpath(file)
  } catch {
    return resolve(file).startsWith(`${resolve(cwd)}${sep}`)
      ? { ok: false, reason: "not-file", message: "That file no longer exists." }
      : outside
  }
  if (!target.startsWith(`${root}${sep}`)) return outside
  let current: number
  try {
    const info = await stat(target)
    if (!info.isFile()) return { ok: false, reason: "not-file", message: "That path is not a file." }
    current = info.mtimeMs
  } catch {
    return { ok: false, reason: "not-file", message: "That file no longer exists." }
  }
  if (current !== expectedMtime) {
    return { ok: false, reason: "conflict", message: "The file changed on disk since it was opened.", mtime: current }
  }
  try {
    await writeFile(target, contents, "utf8")
    const info = await stat(target)
    return { ok: true, mtime: info.mtimeMs, size: info.size }
  } catch (error) {
    return { ok: false, reason: "failed", message: error instanceof Error ? error.message : String(error) }
  }
}
