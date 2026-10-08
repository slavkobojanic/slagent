import { mkdir, rename, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, sep } from "node:path"
import type { ModelRuntime } from "@earendil-works/pi-coding-agent"
import { getAgentDir } from "@earendil-works/pi-coding-agent"
import type { CreateSkillInput, DraftSkillInput, SkillDraft } from "../shared/types"

type Model = NonNullable<ReturnType<ModelRuntime["getModel"]>>

const SYSTEM = [
  "You turn one chat exchange into a reusable agent skill for a coding app.",
  "Reply with a complete SKILL.md file: YAML frontmatter with a name (a kebab-case slug like release-slagent-version)",
  "and a description (one sentence on what the skill does and when the agent should use it),",
  "then instruction markdown that tells an agent how to carry the skill out, step by step,",
  "self-contained so it works without the original chat. Reply with the file only, no code fences.",
].join(" ")

// A hidden one-shot model call: the last exchange plus optional guidance becomes a skill draft.
export async function draftSkill(runtime: ModelRuntime, model: Model, input: DraftSkillInput): Promise<SkillDraft> {
  const parts: string[] = []
  if (input.guidance && input.guidance.trim() !== "") {
    parts.push(`Guidance from the user: ${input.guidance.trim()}`)
  }
  parts.push(`The user's last message:\n${input.userText.slice(0, 20_000)}`)
  parts.push(`Your last response:\n${input.assistantText.slice(0, 20_000)}`)
  const reply = await runtime.completeSimple(
    model,
    {
      systemPrompt: SYSTEM,
      messages: [{ role: "user", content: parts.join("\n\n"), timestamp: Date.now() }],
    },
    { maxTokens: 2000, signal: AbortSignal.timeout(60_000) },
  )
  let text = ""
  for (const part of reply.content) {
    if (part.type === "text") text += part.text
  }
  return parseDraft(text)
}

// The model replies with a frontmatter block, then the body.
export function parseDraft(text: string): SkillDraft {
  let source = text.trim()
  if (source.startsWith("```")) {
    source = source.replace(/^```[a-z]*\n?/, "").replace(/```$/, "").trim()
  }
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(source)
  if (match === null) {
    throw new Error("The model did not return a skill file.")
  }
  const frontmatter = match[1] ?? ""
  const body = (match[2] ?? "").trim()
  const name = sanitizeSkillName(fieldOf(frontmatter, "name") ?? "")
  const description = (fieldOf(frontmatter, "description") ?? "").trim()
  if (name === "" || description === "" || body === "") {
    throw new Error("The model draft was missing a name, description or body.")
  }
  return { name, description, body }
}

// One "key: value" line per field, quotes stripped.
function fieldOf(frontmatter: string, key: string): string | null {
  const line = frontmatter.split("\n").find((row) => row.trim().startsWith(`${key}:`))
  if (line === undefined) {
    return null
  }
  const value = line.slice(line.indexOf(":") + 1).trim()
  return value.replace(/^["']|["']$/g, "")
}

// Lowercase kebab-case, made safe for a folder name.
export function sanitizeSkillName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "")
}

// Writes <base>/<name>/SKILL.md and returns the file path. The user location is
// the agent dir, so the skill is available in every project; the project one stays local.
export async function createSkillFile(cwd: string, input: CreateSkillInput): Promise<string> {
  const name = sanitizeSkillName(input.name)
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    throw new Error("Use a lowercase name with letters, numbers and dashes.")
  }
  const description = input.description.replace(/\s*\n+\s*/g, " ").trim()
  if (description === "") {
    throw new Error("Write a description first.")
  }
  if (input.body.trim() === "") {
    throw new Error("The skill has no instructions.")
  }
  const base = input.location === "project" ? join(cwd, ".agents", "skills") : join(getAgentDir(), "skills")
  const dir = join(base, name)
  if (!dir.startsWith(`${base}${sep}`)) {
    throw new Error("That name is not allowed.")
  }
  await mkdir(dir, { recursive: true })
  const file = join(dir, "SKILL.md")
  const content = `---\nname: ${name}\ndescription: ${JSON.stringify(description)}\n---\n\n${input.body.trim()}\n`
  // A temp file and rename, so a crash never leaves a half-written skill behind.
  const temp = join(tmpdir(), `slagent-skill-${name}-${Date.now()}.md`)
  await writeFile(temp, content)
  await rename(temp, file)
  return file
}