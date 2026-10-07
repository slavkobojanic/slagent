import type { ChatSummary, ModelOption, ProjectSummary, SlashCommand } from "@shared/types"
import { orderedChats } from "@/features/library/library-utils"
import { sortedProjects } from "@/lib/projects"
import { modKey } from "@/lib/format"
import { type Command, type CommandGroup, type CommandShortcut, isCommandEnabled } from "@/state/command-registry"

// Chats get a number hint for the first nine, matching Cmd+1 to Cmd+9.
const CHAT_HINT_COUNT = 9

// Hundreds of models would drown the other groups, so they only show once the query is specific enough.
const MODEL_QUERY_MIN_LENGTH = 2

export type PaletteItem = {
  id: string
  // What the palette's search matches against.
  value: string
  label: string
  detail?: string
  shortcut?: string
  // A greyed-out item stays visible but cannot be chosen.
  disabled?: boolean
  onSelect: () => void
}

export type PaletteGroup = { heading: string; items: PaletteItem[] }

export type PaletteSources = {
  platform: string
  commands: Command[]
  chats: ChatSummary[]
  projects: ProjectSummary[]
  slashCommands: SlashCommand[]
  query: string
  models: ModelOption[]
  currentModelId: string | null
  streaming: boolean
  onRunCommand: (id: string) => void
  onOpenChat: (chat: ChatSummary) => void
  onOpenProject: (project: ProjectSummary) => void
  onFillCommand: (insert: string) => void
  onSelectModel: (modelId: string) => void
}

// The palette's groups, in the order the old palette showed them. Empty groups are dropped.
// Registered commands fill their own group. Chats, skills, projects, and models come from the library and the mirror.
export function paletteGroups(sources: PaletteSources): PaletteGroup[] {
  const {
    platform,
    commands,
    chats,
    projects,
    slashCommands,
    query,
    models,
    currentModelId,
    streaming,
    onRunCommand,
    onOpenChat,
    onOpenProject,
    onFillCommand,
    onSelectModel,
  } = sources
  const groups: PaletteGroup[] = [
    { heading: "Actions", items: commandItems(commands, "Actions", platform, onRunCommand) },
    {
      heading: "Chats",
      items: [...commandItems(commands, "Chats", platform, onRunCommand), ...chatItems(chats, platform, onOpenChat)],
    },
    {
      heading: "Skills and commands",
      items: [...commandItems(commands, "Commands", platform, onRunCommand), ...slashItems(slashCommands, onFillCommand)],
    },
    {
      heading: "Projects",
      items: [...commandItems(commands, "Projects", platform, onRunCommand), ...projectItems(projects, onOpenProject)],
    },
    { heading: "Models", items: modelItems(models, query, currentModelId, streaming, onSelectModel) },
  ]
  return groups.filter((group) => group.items.length > 0)
}

// A command is listed unless it sets inPalette to false. Disabled commands are filtered out.
function commandItems(commands: Command[], group: CommandGroup, platform: string, onRunCommand: (id: string) => void): PaletteItem[] {
  return commands
    .filter((command) => command.group === group && command.inPalette !== false && isCommandEnabled(command))
    .map((command) => ({
      id: command.id,
      value: `command ${command.id} ${command.label}`,
      label: command.label,
      shortcut: command.shortcut === undefined ? undefined : formatShortcut(command.shortcut, platform),
      onSelect: () => onRunCommand(command.id),
    }))
}

function chatItems(chats: ChatSummary[], platform: string, onOpenChat: (chat: ChatSummary) => void): PaletteItem[] {
  const mod = modKey(platform)
  return orderedChats(chats).map((chat, index) => ({
    id: chat.id,
    value: `chat ${chat.id} ${chat.title}`,
    label: chat.title,
    shortcut: index < CHAT_HINT_COUNT ? `${mod}${index + 1}` : undefined,
    onSelect: () => onOpenChat(chat),
  }))
}

function slashItems(slashCommands: SlashCommand[], onFillCommand: (insert: string) => void): PaletteItem[] {
  return slashCommands.map((command) => ({
    id: command.insert,
    value: `skill ${command.insert} ${command.description}`,
    label: command.insert,
    detail: command.description,
    onSelect: () => onFillCommand(command.insert),
  }))
}

function projectItems(projects: ProjectSummary[], onOpenProject: (project: ProjectSummary) => void): PaletteItem[] {
  return sortedProjects(projects).map((project) => ({
    id: project.id,
    value: `project ${project.id} ${project.name} ${project.path}`,
    label: project.name,
    detail: project.path,
    onSelect: () => onOpenProject(project),
  }))
}

// Every model, in the order the app lists them. The current model is greyed out, and so is every model while a run streams.
function modelItems(
  models: ModelOption[],
  query: string,
  currentModelId: string | null,
  streaming: boolean,
  onSelectModel: (modelId: string) => void,
): PaletteItem[] {
  if (query.trim().length < MODEL_QUERY_MIN_LENGTH) {
    return []
  }
  return models.map((model) => ({
    id: model.id,
    value: `model ${model.id} ${model.name}`,
    label: model.name,
    detail: model.id,
    disabled: streaming || model.id === currentModelId,
    onSelect: () => onSelectModel(model.id),
  }))
}

// A shortcut as a hint: modifier glyphs in the usual order, then the key. Escape reads "Esc".
export function formatShortcut(shortcut: CommandShortcut, platform: string): string {
  const mod = shortcut.mod ? modKey(platform) : ""
  const alt = shortcut.alt ? "⌥" : ""
  const shift = shortcut.shift ? "⇧" : ""
  return `${mod}${alt}${shift}${keyLabel(shortcut.key)}`
}

function keyLabel(key: string): string {
  if (key.toLowerCase() === "escape") {
    return "Esc"
  }
  if (key.length === 1) {
    return key.toUpperCase()
  }
  return key
}
