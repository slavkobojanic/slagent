import { type AgentSession, DefaultResourceLoader, getAgentDir, SettingsManager } from "@earendil-works/pi-coding-agent"
import type { SlashCommand } from "../shared/types"

type Skill = { name: string; description: string }
type Template = { name: string; description: string }
type Command = { invocationName: string; description?: string }

// Pi expands these itself when a prompt starts with them: /skill:name, /template
// and extension commands. The composer only has to insert the right text.

export function sessionCommands(session: AgentSession): SlashCommand[] {
  return buildCommands(
    session.resourceLoader.getSkills().skills,
    session.promptTemplates,
    session.extensionRunner.getRegisteredCommands(),
  )
}

export async function draftCommands(cwd: string): Promise<SlashCommand[]> {
  const agentDir = getAgentDir()
  const loader = new DefaultResourceLoader({
    cwd,
    agentDir,
    settingsManager: SettingsManager.create(cwd, agentDir),
    noExtensions: true,
    noThemes: true,
  })
  await loader.reload()
  return buildCommands(loader.getSkills().skills, loader.getPrompts().prompts, [])
}

function buildCommands(skills: readonly Skill[], templates: readonly Template[], commands: readonly Command[]): SlashCommand[] {
  const result: SlashCommand[] = []
  const seen = new Set<string>()
  function add(command: SlashCommand) {
    if (seen.has(command.insert)) return
    seen.add(command.insert)
    result.push(command)
  }
  for (const skill of skills) {
    add({ name: skill.name, insert: `/skill:${skill.name}`, description: skill.description, kind: "skill" })
  }
  for (const template of templates) {
    add({ name: template.name, insert: `/${template.name}`, description: template.description, kind: "prompt" })
  }
  for (const command of commands) {
    add({
      name: command.invocationName,
      insert: `/${command.invocationName}`,
      description: command.description ?? "",
      kind: "command",
    })
  }
  result.sort((left, right) => left.name.localeCompare(right.name))
  return result
}
