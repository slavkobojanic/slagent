import { stat, writeFile } from "node:fs/promises"
import { resolve, sep } from "node:path"
import type { WriteFileResult } from "../shared/types"

// Saves editor contents. Refuses anything outside the project and anything that
// changed on disk since the editor read it, so an external edit is never lost.
export async function writeProjectFile(cwd: string, file: string, contents: string, expectedMtime: number): Promise<WriteFileResult> {
  const root = cwd ? resolve(cwd) : ""
  if (!root || !file.startsWith(`${root}${sep}`)) {
    return { ok: false, reason: "outside-project", message: "Only files inside the open project can be saved." }
  }
  let current: number
  try {
    const info = await stat(file)
    if (!info.isFile()) return { ok: false, reason: "not-file", message: "That path is not a file." }
    current = info.mtimeMs
  } catch {
    return { ok: false, reason: "not-file", message: "That file no longer exists." }
  }
  if (current !== expectedMtime) {
    return { ok: false, reason: "conflict", message: "The file changed on disk since it was opened.", mtime: current }
  }
  try {
    await writeFile(file, contents, "utf8")
    const info = await stat(file)
    return { ok: true, mtime: info.mtimeMs, size: info.size }
  } catch (error) {
    return { ok: false, reason: "failed", message: error instanceof Error ? error.message : String(error) }
  }
}
