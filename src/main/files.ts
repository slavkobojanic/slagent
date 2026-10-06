import { readdir, readFile, stat } from "node:fs/promises"
import { basename, join, relative } from "node:path"
import type { AttachmentKind, FileMatch } from "../shared/types"

const SKIP = new Set([
  ".git",
  "node_modules",
  "dist",
  "out",
  "build",
  ".next",
  "coverage",
  ".turbo",
  ".cache",
])

const CODE_EXT = new Set([
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "py",
  "rb",
  "go",
  "rs",
  "java",
  "kt",
  "swift",
  "c",
  "h",
  "cpp",
  "hpp",
  "cs",
  "php",
  "sql",
  "sh",
  "bash",
  "zsh",
  "json",
  "jsonc",
  "yml",
  "yaml",
  "toml",
  "md",
  "txt",
  "css",
  "scss",
  "html",
  "xml",
  "csv",
  "env",
  "lock",
])

const PDF_LIMIT = 80_000
const FILE_CAP = 5_000
const cache = new Map<string, { at: number; files: string[] }>()

export function attachmentKind(name: string, mimeType: string): AttachmentKind {
  const mime = mimeType.toLowerCase()
  if (mime.startsWith("image/")) return "image"
  if (mime === "application/pdf" || name.toLowerCase().endsWith(".pdf")) return "pdf"
  const ext = extension(name)
  if (CODE_EXT.has(ext) || mime.startsWith("text/")) return "code"
  return "file"
}

export function mimeForName(name: string, fallback: string): string {
  if (fallback) return fallback
  const ext = extension(name)
  if (ext === "pdf") return "application/pdf"
  if (ext === "png") return "image/png"
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg"
  if (ext === "gif") return "image/gif"
  if (ext === "webp") return "image/webp"
  if (CODE_EXT.has(ext)) return "text/plain"
  return "application/octet-stream"
}

export async function pdfText(bytes: Uint8Array): Promise<string> {
  const { extractText } = await import("unpdf")
  const result = await extractText(bytes, { mergePages: true })
  const trimmed = result.text.trim()
  if (!trimmed) return "This PDF had no extractable text."
  if (trimmed.length <= PDF_LIMIT) return trimmed
  return `${trimmed.slice(0, PDF_LIMIT)}\n\n… truncated`
}

export async function searchProjectFiles(root: string, query: string): Promise<FileMatch[]> {
  const files = await projectFiles(root)
  const needle = query.trim().toLowerCase()
  const ranked: { path: string; name: string; score: number }[] = []
  for (const file of files) {
    const name = basename(file)
    const relativePath = relative(root, file).toLowerCase()
    const lower = name.toLowerCase()
    let score = 0
    if (!needle) score = 1
    else if (lower === needle) score = 0
    else if (lower.startsWith(needle)) score = 1
    else if (lower.includes(needle)) score = 2
    else if (relativePath.includes(needle)) score = 3
    else continue
    ranked.push({ path: file, name, score })
  }
  ranked.sort((left, right) => {
    if (left.score !== right.score) return left.score - right.score
    return left.path.localeCompare(right.path)
  })
  return ranked.slice(0, 20).map((item) => ({ path: item.path, name: item.name }))
}

async function projectFiles(root: string): Promise<string[]> {
  const hit = cache.get(root)
  if (hit && Date.now() - hit.at < 10_000) return hit.files
  const files: string[] = []
  const queue = [root]
  while (queue.length > 0 && files.length < FILE_CAP) {
    const dir = queue.shift()
    if (!dir) break
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) {
        if (entry.name !== ".env") continue
      }
      if (SKIP.has(entry.name)) continue
      const next = join(dir, entry.name)
      if (entry.isDirectory()) {
        queue.push(next)
        continue
      }
      if (!entry.isFile()) continue
      files.push(next)
      if (files.length >= FILE_CAP) break
    }
  }
  cache.set(root, { at: Date.now(), files })
  return files
}

function extension(name: string): string {
  const dot = name.lastIndexOf(".")
  if (dot < 0) return ""
  return name.slice(dot + 1).toLowerCase()
}

export async function readBytes(file: string): Promise<Buffer> {
  const info = await stat(file)
  if (!info.isFile()) throw new Error("That attachment is not a file.")
  if (info.size > 20 * 1024 * 1024) throw new Error("That file is larger than 20MB.")
  return readFile(file)
}
