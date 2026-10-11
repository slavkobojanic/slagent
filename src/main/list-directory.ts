import { readdir, realpath, stat } from "node:fs/promises"
import { isAbsolute, join, sep } from "node:path"
import type { DirectoryEntry } from "../shared/types"

const MAX_ENTRIES = 5000

// Lists one folder of the open project for the editor's file tree. The path is relative to the
// project and is resolved through symlinks, so a link cannot show a folder outside it.
export async function listProjectDirectory(cwd: string, relative: string): Promise<DirectoryEntry[] | null> {
  if (!cwd || isAbsolute(relative)) return null
  let root: string
  let target: string
  try {
    root = await realpath(cwd)
    target = await realpath(join(root, relative))
  } catch {
    return null
  }
  if (target !== root && !target.startsWith(`${root}${sep}`)) return null
  let names
  try {
    names = await readdir(target, { withFileTypes: true })
  } catch {
    return null
  }
  const entries: DirectoryEntry[] = []
  for (const entry of names.slice(0, MAX_ENTRIES)) {
    if (entry.name === ".git") continue
    let dir = entry.isDirectory()
    if (entry.isSymbolicLink()) dir = await stat(join(target, entry.name)).then((info) => info.isDirectory(), () => false)
    entries.push({ name: entry.name, dir })
  }
  return entries.sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
}
