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

export type Prefs = {
  cwd?: string
  modelId?: string
  titleModelId?: string
  routing?: ModelRouting
  effort?: EffortLevel
  personalisation?: Personalisation
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
    return prefs
  } catch {
    return {}
  }
}

export async function writePrefs(file: string, prefs: Prefs): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, `${JSON.stringify(prefs, null, 2)}\n`)
}
