import { join, resolve, sep } from "node:path"

// Maps a slagent://app/... pathname to a file under the renderer build, or null when it
// would escape that folder. The renderer is served from this scheme instead of file:// because
// the VS Code extension host iframe needs a real origin to talk to its parent.
export function rendererFile(root: string, pathname: string): string | null {
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return null
  }
  const base = resolve(root)
  const file = resolve(join(base, decoded === "/" ? "index.html" : decoded))
  if (file !== base && !file.startsWith(`${base}${sep}`)) return null
  return file
}
