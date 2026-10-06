import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

export type Prefs = {
  cwd?: string
  modelId?: string
}

export async function readPrefs(file: string): Promise<Prefs> {
  try {
    const raw = await readFile(file, "utf8")
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== "object" || parsed === null) return {}
    const record = parsed as Record<string, unknown>
    const prefs: Prefs = {}
    if (typeof record.cwd === "string") prefs.cwd = record.cwd
    if (typeof record.modelId === "string") prefs.modelId = record.modelId
    return prefs
  } catch {
    return {}
  }
}

export async function writePrefs(file: string, prefs: Prefs): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, `${JSON.stringify(prefs, null, 2)}\n`)
}
