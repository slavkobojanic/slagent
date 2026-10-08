import type { SlashCommand } from "@shared/types"

// The app-provided commands behind the "#" prefix. They never reach the model:
// the composer intercepts them on send and runs the built-in behaviour instead.
export const BUILT_IN_COMMANDS: SlashCommand[] = [
  {
    name: "Create skill",
    insert: "#create-skill",
    description: "Turn the last exchange into a reusable skill",
    kind: "builtin",
  },
]

// The built-in at the start of the prompt, with anything typed after it as guidance.
export function builtinAtStart(text: string): { command: SlashCommand; rest: string } | null {
  for (const command of BUILT_IN_COMMANDS) {
    if (text === command.insert || text.startsWith(`${command.insert} `)) {
      return { command, rest: text.slice(command.insert.length).trim() }
    }
  }
  return null
}