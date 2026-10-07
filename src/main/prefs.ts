import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import {
  EMPTY_PERSONALISATION,
  type Personalisation,
  type PersonalisationBranch,
  type PersonalisationBrevity,
  type PersonalisationCommit,
  type PersonalisationCommitStrategy,
  type PersonalisationExplanation,
  type PersonalisationTone,
} from "../shared/types"

export type Prefs = {
  cwd?: string
  modelId?: string
  personalisation?: Personalisation
}

const TONES: PersonalisationTone[] = ["direct", "friendly", "professional"]
const BREVITIES: PersonalisationBrevity[] = ["terse", "balanced", "detailed"]
const BRANCHES: PersonalisationBranch[] = ["descriptive", "prefix"]
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
  return {
    tone: pick("tone", TONES),
    brevity: pick("brevity", BREVITIES),
    branchNaming: pick("branchNaming", BRANCHES),
    branchPrefix: text("branchPrefix", 40),
    commitStyle: pick("commitStyle", COMMITS),
    emoji: flag("emoji"),
    language: text("language", 60),
    explanation: pick("explanation", EXPLANATIONS),
    checkBeforeFinish: flag("checkBeforeFinish"),
    commitStrategy: pick("commitStrategy", COMMIT_STRATEGIES) ?? legacyCommitStrategy(flag("askBeforeCommit"), flag("commitOften")),
    notes: text("notes", 4000),
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
