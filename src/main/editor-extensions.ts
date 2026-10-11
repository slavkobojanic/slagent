import { createHash, randomUUID } from "node:crypto"
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises"
import { dirname, join, normalize, sep } from "node:path"
import { unzipSync } from "fflate"
import { isExtensionId, isExtensionVersion, type EditorExtensionPayload, type EditorExtensionResult } from "../shared/editor"

const REGISTRY = "https://open-vsx.org"
const MAX_DOWNLOAD = 150 * 1024 * 1024
const MAX_UNPACKED = 500 * 1024 * 1024
const MAX_FILES = 20000

type Fetch = (url: string) => Promise<Response>

export class ExtensionInstallError extends Error {}

function fail(message: string): never {
  throw new ExtensionInstallError(message)
}

// Every url the registry hands back is followed only when it stays on the registry.
function registryUrl(url: unknown): string {
  if (typeof url !== "string" || !url.startsWith(`${REGISTRY}/`)) fail("The registry returned an unexpected address.")
  return url
}

async function json(fetchFn: Fetch, url: string): Promise<Record<string, unknown>> {
  const response = await fetchFn(url)
  if (!response.ok) fail(`The registry answered ${response.status}.`)
  const body: unknown = await response.json()
  if (typeof body !== "object" || body === null) fail("The registry returned something unexpected.")
  return body as Record<string, unknown>
}

export async function searchOpenVsx(query: string, fetchFn: Fetch = fetch): Promise<EditorExtensionResult[]> {
  const trimmed = query.trim().slice(0, 100)
  if (!trimmed) return []
  const body = await json(fetchFn, `${REGISTRY}/api/-/search?query=${encodeURIComponent(trimmed)}&size=20&sortBy=relevance`)
  const list = Array.isArray(body.extensions) ? body.extensions : []
  const results: EditorExtensionResult[] = []
  for (const entry of list) {
    if (typeof entry !== "object" || entry === null) continue
    const item = entry as Record<string, unknown>
    const id = `${String(item.namespace)}.${String(item.name)}`
    if (!isExtensionId(id) || !isExtensionVersion(item.version)) continue
    const files = typeof item.files === "object" && item.files !== null ? (item.files as Record<string, unknown>) : {}
    results.push({
      id,
      version: item.version,
      name: typeof item.displayName === "string" && item.displayName ? item.displayName : String(item.name),
      description: typeof item.description === "string" ? item.description : "",
      downloads: typeof item.downloadCount === "number" ? item.downloadCount : 0,
      verified: item.verified === true,
      iconUrl: typeof files.icon === "string" && files.icon.startsWith(`${REGISTRY}/`) ? files.icon : null,
    })
  }
  return results
}

async function download(fetchFn: Fetch, url: string): Promise<Uint8Array> {
  const response = await fetchFn(url)
  if (!response.ok || !response.body) fail(`The download failed with ${response.status}.`)
  const declared = Number(response.headers.get("content-length") ?? 0)
  if (declared > MAX_DOWNLOAD) fail("The extension is too large to install.")
  const chunks: Uint8Array[] = []
  let total = 0
  const reader = response.body.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_DOWNLOAD) {
      await reader.cancel()
      fail("The extension is too large to install.")
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

// A relative path inside the archive's extension/ folder, or null when it is not a plain file path
// under it. Anything that could land outside the install folder is refused by the caller.
export function archiveTarget(name: string): string | null {
  if (!name.startsWith("extension/") || name.endsWith("/")) return null
  const relative = name.slice("extension/".length)
  if (!relative || relative.includes("\\") || relative.includes("\0")) return "unsafe"
  const parts = relative.split("/")
  if (parts.some((part) => part === ".." || part === "." || part === "")) return "unsafe"
  return relative
}

export function extensionDir(root: string, id: string, version: string): string {
  return join(root, id.toLowerCase(), version)
}

export type InstallResult = { id: string; version: string }

// Downloads the latest release of publisher.name from Open VSX, checks it against the published
// sha256, and unpacks its extension/ folder under root/<id>/<version>.
export async function installFromOpenVsx(root: string, id: string, fetchFn: Fetch = fetch): Promise<InstallResult> {
  if (!isExtensionId(id)) fail("That is not a valid extension id.")
  const dot = id.indexOf(".")
  const meta = await json(fetchFn, `${REGISTRY}/api/${encodeURIComponent(id.slice(0, dot))}/${encodeURIComponent(id.slice(dot + 1))}`)
  const version = meta.version
  if (!isExtensionVersion(version)) fail("The registry returned an unexpected version.")
  const files = typeof meta.files === "object" && meta.files !== null ? (meta.files as Record<string, unknown>) : {}
  const archiveUrl = registryUrl(files.download)
  if (typeof files.sha256 !== "string") fail("The registry publishes no checksum for this extension, so it was not installed.")
  const checksumUrl = registryUrl(files.sha256)

  const checksumResponse = await fetchFn(checksumUrl)
  if (!checksumResponse.ok) fail("The checksum could not be fetched.")
  const expected = (await checksumResponse.text()).trim().split(/\s+/)[0]?.toLowerCase() ?? ""
  const bytes = await download(fetchFn, archiveUrl)
  const actual = createHash("sha256").update(bytes).digest("hex")
  if (!/^[0-9a-f]{64}$/.test(expected) || expected !== actual) fail("The download does not match its published checksum.")

  let total = 0
  let count = 0
  const entries = unzipSync(bytes, {
    filter: (entry) => {
      const target = archiveTarget(entry.name)
      if (target === null) return false
      if (target === "unsafe") fail("The extension archive contains an unsafe path.")
      count += 1
      total += entry.originalSize
      if (count > MAX_FILES || total > MAX_UNPACKED) fail("The extension is too large to install.")
      return true
    },
  })

  const staging = join(root, `.staging-${randomUUID()}`)
  try {
    for (const [entryName, data] of Object.entries(entries)) {
      const relative = archiveTarget(entryName)
      if (relative === null || relative === "unsafe") continue
      const file = join(staging, relative)
      if (!normalize(file).startsWith(`${normalize(staging)}${sep}`)) fail("The extension archive contains an unsafe path.")
      await mkdir(dirname(file), { recursive: true })
      await writeFile(file, data)
    }
    const manifest = await readManifest(staging)
    const declared = `${String(manifest.publisher)}.${String(manifest.name)}`.toLowerCase()
    if (declared !== id.toLowerCase()) fail("The extension does not match the id that was requested.")
    const target = extensionDir(root, id, version)
    // An upgrade replaces every older copy.
    await rm(join(root, id.toLowerCase()), { recursive: true, force: true })
    await mkdir(dirname(target), { recursive: true })
    await rename(staging, target)
  } finally {
    await rm(staging, { recursive: true, force: true })
  }
  return { id, version }
}

async function readManifest(dir: string): Promise<Record<string, unknown>> {
  let parsed: unknown
  try {
    parsed = JSON.parse(await readFile(join(dir, "package.json"), "utf8"))
  } catch {
    fail("The extension has no readable package.json.")
  }
  if (typeof parsed !== "object" || parsed === null) fail("The extension manifest is not valid.")
  return parsed as Record<string, unknown>
}

async function listFiles(dir: string, prefix = ""): Promise<string[]> {
  const found: string[] = []
  for (const entry of await readdir(join(dir, prefix), { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) found.push(...(await listFiles(dir, relative)))
    else if (entry.isFile()) found.push(relative)
  }
  return found
}

export async function readInstalled(root: string, id: string, version: string, serverUrl: string): Promise<EditorExtensionPayload | null> {
  if (!isExtensionId(id) || !isExtensionVersion(version)) return null
  const dir = extensionDir(root, id, version)
  try {
    await stat(dir)
  } catch {
    return null
  }
  const manifest = await readManifest(dir)
  const files = await listFiles(dir)
  return { id, version, manifest, files, baseUrl: `${serverUrl}/${id.toLowerCase()}/${version}` }
}

export async function removeInstalled(root: string, id: string): Promise<void> {
  if (!isExtensionId(id)) return
  await rm(join(root, id.toLowerCase()), { recursive: true, force: true })
}
