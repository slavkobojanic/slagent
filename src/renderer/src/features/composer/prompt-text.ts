import type { SlashCommand, SlashCommandKind } from "@shared/types"

// An open @file, $chat, or history query: where it starts in the text, and what is typed after it.
export type Trigger = { query: string; start: number }

// A trigger starts where a word starts, and its query stops at the first space or newline.
function triggerAt(before: string, start: number): Trigger | null {
  const previous = before[start - 1]
  if (previous && !/\s/.test(previous)) {
    return null
  }
  const query = before.slice(start + 1)
  if (query.includes(" ") || query.includes("\n")) {
    return null
  }
  return { query, start }
}

export function mentionAt(value: string, cursor: number): Trigger | null {
  const before = value.slice(0, cursor)
  const at = before.lastIndexOf("@")
  if (at < 0) {
    return null
  }
  return triggerAt(before, at)
}

// Yields to "@" so that "@a$b" stays a file mention.
export function chatMentionAt(value: string, cursor: number): Trigger | null {
  const before = value.slice(0, cursor)
  const dollar = before.lastIndexOf("$")
  if (dollar < 0) {
    return null
  }
  if (before.lastIndexOf("@") > dollar) {
    return null
  }
  return triggerAt(before, dollar)
}

// The text after a leading "/" while the caret is still in the first word, or null.
export function slashAt(value: string, cursor: number): string | null {
  const match = /^\/(\S*)$/.exec(value.slice(0, cursor))
  if (match === null) {
    return null
  }
  return match[1] ?? ""
}

// Commands whose name starts with the query come first, then those that contain it. At most 50.
export function filterCommands(commands: SlashCommand[], query: string): SlashCommand[] {
  const needle = query.toLowerCase()
  const starts: SlashCommand[] = []
  const contains: SlashCommand[] = []
  for (const command of commands) {
    const name = command.insert.slice(1).toLowerCase()
    if (name.startsWith(needle) || command.name.toLowerCase().startsWith(needle)) {
      starts.push(command)
    } else if (name.includes(needle)) {
      contains.push(command)
    }
  }
  return [...starts, ...contains].slice(0, 50)
}

export function kindLabel(kind: SlashCommandKind): string {
  if (kind === "skill") {
    return "Skill"
  }
  if (kind === "prompt") {
    return "Prompt template"
  }
  return "Command"
}
