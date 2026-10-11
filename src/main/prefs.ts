import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import {
  EMPTY_PERSONALISATION,
  PINNED_FILE_CHAR_LIMIT,
  PINNED_FILE_COUNT_LIMIT,
  PINNED_TOTAL_CHAR_LIMIT,
  type ModelRouting,
  type EffortLevel,
  type Personalisation,
  type PinnedFile,
  type PersonalisationBranch,
  type PersonalisationBrevity,
  type PersonalisationGitWorkflow,
  type PersonalisationCommit,
  type PersonalisationCommitStrategy,
  type PersonalisationExplanation,
  type PersonalisationTone,
} from "../shared/types"
import {
  DEFAULT_EDITOR_PREFS,
  EDITOR_FONT_SIZE,
  EDITOR_PACKS,
  EDITOR_TAB_SIZE,
  type EditorExtensionPref,
  type EditorPrefs,
} from "../shared/editor"

export type Prefs = {
  cwd?: string
  modelId?: string
  titleModelId?: string
  routing?: ModelRouting
  effort?: EffortLevel
  personalisation?: Personalisation
  editor?: EditorPrefs
}

const ROUTINGS: ModelRouting[] = ["speed", "cost", "balance"]

// An unknown or missing value falls back to OpenRouter's own balance.
export function parseRouting(value: unknown): ModelRouting {
  return ROUTINGS.includes(value as ModelRouting) ? (value as ModelRouting) : "balance"
}

export const EFFORT_LEVELS: EffortLevel[] = ["minimal", "low", "medium", "high", "xhigh", "max"]

// An unknown or missing value falls back to medium.
export function parseEffort(value: unknown): EffortLevel {
  return EFFORT_LEVELS.includes(value as EffortLevel) ? (value as EffortLevel) : "medium"
}

const TONES: PersonalisationTone[] = ["direct", "friendly", "professional"]
const BREVITIES: PersonalisationBrevity[] = ["terse", "balanced", "detailed"]
const BRANCHES: PersonalisationBranch[] = ["descriptive", "prefix"]
const GIT_WORKFLOWS: PersonalisationGitWorkflow[] = ["main", "branch"]
const COMMITS: PersonalisationCommit[] = ["conventional", "imperative", "free"]
const EXPLANATIONS: PersonalisationExplanation[] = ["minimal", "normal", "educational"]
const COMMIT_STRATEGIES: PersonalisationCommitStrategy[] = ["ask", "when-asked", "at-end", "as-you-go"]

// Personalisation reaches the agent's system prompt, so only ever read back
// known keys with known shapes.
export function parsePersonalisation(input: unknown): Personalisation {
  if (typeof input !== "object" || input === null) return { ...EMPTY_PERSONALISATION }
  const record = input as Record<string, unknown>
  const pick = <T extends string>(key: string, allowed: T[]): T | null => {
    const value = record[key]
    return allowed.includes(value as T) ? (value as T) : null
  }
  const text = (key: string, max: number): string | null => {
    const value = record[key]
    if (typeof value !== "string") return null
    const trimmed = value.trim().slice(0, max)
    return trimmed || null
  }
  const flag = (key: string): boolean | null => {
    const value = record[key]
    return typeof value === "boolean" ? value : null
  }
  const pinnedFiles = (key: string): PinnedFile[] | null => {
    const value = record[key]
    if (!Array.isArray(value)) return null
    const files: PinnedFile[] = []
    let total = 0
    for (const entry of value.slice(0, PINNED_FILE_COUNT_LIMIT)) {
      if (typeof entry !== "object" || entry === null) continue
      const item = entry as Record<string, unknown>
      if (typeof item.name !== "string" || typeof item.content !== "string") continue
      const name = item.name.trim().slice(0, 200)
      if (!name) continue
      const content = item.content.slice(0, PINNED_FILE_CHAR_LIMIT)
      if (!content) continue
      if (total + content.length > PINNED_TOTAL_CHAR_LIMIT) break
      files.push({ name, content })
      total += content.length
    }
    return files.length > 0 ? files : null
  }
  return {
    tone: pick("tone", TONES),
    brevity: pick("brevity", BREVITIES),
    branchNaming: pick("branchNaming", BRANCHES),
    branchPrefix: text("branchPrefix", 40),
    gitWorkflow: pick("gitWorkflow", GIT_WORKFLOWS),
    commitStyle: pick("commitStyle", COMMITS),
    emoji: flag("emoji"),
    language: text("language", 60),
    explanation: pick("explanation", EXPLANATIONS),
    checkBeforeFinish: flag("checkBeforeFinish"),
    commitStrategy: pick("commitStrategy", COMMIT_STRATEGIES) ?? legacyCommitStrategy(flag("askBeforeCommit"), flag("commitOften")),
    notes: text("notes", 4000),
    pinnedFiles: pinnedFiles("pinnedFiles"),
  }
}

// Older prefs stored two separate flags; map them onto the single strategy.
function legacyCommitStrategy(ask: boolean | null, often: boolean | null): PersonalisationCommitStrategy | null {
  if (ask === true) return "ask"
  if (often === true) return "as-you-go"
  if (ask === false) return "when-asked"
  return null
}

// Editor settings drive which code loads and which extensions run, so every field is
// clamped or filtered and an unknown pack or malformed extension is dropped.
export function parseEditorPrefs(input: unknown): EditorPrefs {
  if (typeof input !== "object" || input === null) return { ...DEFAULT_EDITOR_PREFS, packs: [...DEFAULT_EDITOR_PREFS.packs], extensions: [] }
  const record = input as Record<string, unknown>
  const int = (key: string, fallback: number, range: { min: number; max: number }): number => {
    const value = record[key]
    if (typeof value !== "number" || !Number.isFinite(value)) return fallback
    return Math.min(range.max, Math.max(range.min, Math.round(value)))
  }
  const flag = (key: string, fallback: boolean): boolean => (typeof record[key] === "boolean" ? (record[key] as boolean) : fallback)
  const known = new Set(EDITOR_PACKS.map((pack) => pack.id))
  const packs = Array.isArray(record.packs)
    ? [...new Set(record.packs.filter((id): id is string => typeof id === "string" && known.has(id)))]
    : [...DEFAULT_EDITOR_PREFS.packs]
  const extensions: EditorExtensionPref[] = []
  if (Array.isArray(record.extensions)) {
    for (const entry of record.extensions) {
      if (typeof entry !== "object" || entry === null) continue
      const item = entry as Record<string, unknown>
      if (typeof item.id !== "string" || !EXTENSION_ID.test(item.id)) continue
      if (typeof item.version !== "string" || !EXTENSION_VERSION.test(item.version)) continue
      if (extensions.some((existing) => existing.id === item.id)) continue
      extensions.push({ id: item.id, version: item.version, enabled: item.enabled !== false })
    }
  }
  return {
    fontSize: int("fontSize", DEFAULT_EDITOR_PREFS.fontSize, EDITOR_FONT_SIZE),
    tabSize: int("tabSize", DEFAULT_EDITOR_PREFS.tabSize, EDITOR_TAB_SIZE),
    wordWrap: flag("wordWrap", DEFAULT_EDITOR_PREFS.wordWrap),
    minimap: flag("minimap", DEFAULT_EDITOR_PREFS.minimap),
    packs,
    extensions,
  }
}

// publisher.name, as on Open VSX. The id becomes a folder name, so nothing else gets through.
const EXTENSION_ID = /^[a-z0-9][a-z0-9-]*\.[a-z0-9][a-z0-9._-]*$/i
const EXTENSION_VERSION = /^[0-9][0-9a-z.+-]*$/i

export async function readPrefs(file: string): Promise<Prefs> {
  try {
    const raw = await readFile(file, "utf8")
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== "object" || parsed === null) return {}
    const record = parsed as Record<string, unknown>
    const prefs: Prefs = {}
    if (typeof record.cwd === "string") prefs.cwd = record.cwd
    if (typeof record.modelId === "string") prefs.modelId = record.modelId
    if (typeof record.titleModelId === "string") prefs.titleModelId = record.titleModelId
    if (typeof record.routing === "string") prefs.routing = parseRouting(record.routing)
    if (typeof record.personalisation === "object" && record.personalisation !== null) {
      prefs.personalisation = parsePersonalisation(record.personalisation)
    }
    if (typeof record.editor === "object" && record.editor !== null) prefs.editor = parseEditorPrefs(record.editor)
    return prefs
  } catch {
    return {}
  }
}

export async function writePrefs(file: string, prefs: Prefs): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, `${JSON.stringify(prefs, null, 2)}\n`)
}
