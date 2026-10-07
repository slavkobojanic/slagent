import type { ToolMessage } from "@shared/types"
import {
  BotIcon,
  FileTextIcon,
  FolderIcon,
  ListChecksIcon,
  MessageCircleQuestionIcon,
  PencilIcon,
  SearchIcon,
  ServerIcon,
  TerminalIcon,
  type LucideIcon,
} from "lucide-react"

// Tools whose first argument is a file path, so their label links to the file.
const PATH_TOOLS = ["read", "edit", "write", "ls"]

// The command a bash tool ran. Long arguments are truncated and no longer parse, so the label
// is the fallback.
export function bashCommand(tool: ToolMessage): string {
  try {
    const args = JSON.parse(tool.args) as { command?: unknown }
    if (typeof args.command === "string" && args.command) {
      return args.command
    }
  } catch {
    // Fall through to the label.
  }
  if (tool.label.startsWith("bash  ")) {
    return tool.label.slice("bash  ".length)
  }
  return tool.label
}

// The file a tool works on, with its :offset when it starts past the first line.
export function toolPath(tool: ToolMessage): string | null {
  if (!PATH_TOOLS.includes(tool.name)) {
    return null
  }
  try {
    const args = JSON.parse(tool.args) as { path?: unknown; file_path?: unknown; offset?: unknown }
    const path = args.path ?? args.file_path
    if (typeof path !== "string" || !path) {
      return null
    }
    if (typeof args.offset === "number" && args.offset > 0) {
      return `${path}:${args.offset}`
    }
    return path
  } catch {
    return null
  }
}

export function toolIcon(name: string): LucideIcon {
  if (name === "bash") {
    return TerminalIcon
  }
  if (name === "grep" || name === "find") {
    return SearchIcon
  }
  if (name === "ls") {
    return FolderIcon
  }
  if (name === "edit" || name === "write") {
    return PencilIcon
  }
  if (name === "subagent") {
    return BotIcon
  }
  if (name === "ask_user") {
    return MessageCircleQuestionIcon
  }
  if (name === "todo" || name === "propose_plan") {
    return ListChecksIcon
  }
  if (name === "bash_background" || name === "task_output" || name === "task_stop") {
    return ServerIcon
  }
  return FileTextIcon
}

// A step's label: a sentence for bash and questions, the file for a path tool, or the tool's own label.
export type ToolLabel = { kind: "text"; text: string } | { kind: "file"; name: string; path: string }

export function toolLabel(tool: ToolMessage): ToolLabel {
  if (tool.name === "bash") {
    return { kind: "text", text: bashLabel(tool) }
  }
  if (tool.name === "ask_user") {
    return { kind: "text", text: questionLabel(tool) }
  }
  const path = toolPath(tool)
  if (path === null) {
    return { kind: "text", text: tool.label }
  }
  return { kind: "file", name: tool.name, path }
}

function bashLabel(tool: ToolMessage): string {
  if (tool.running) {
    return "Running command"
  }
  if (tool.isError) {
    return "Command failed"
  }
  return "Ran command"
}

function questionLabel(tool: ToolMessage): string {
  if (tool.running) {
    return "Waiting for your answer"
  }
  if (tool.isError) {
    return "Question cancelled"
  }
  if (tool.answers?.length === 1) {
    return "Asked a question"
  }
  return "Asked questions"
}

// Which body a step shows: the bash terminal, the answers to a question, or the plain output.
export type ToolOutputKind = "bash" | "answers" | "output"

export function toolOutputKind(tool: ToolMessage): ToolOutputKind {
  if (tool.name === "bash") {
    return "bash"
  }
  if (tool.name === "ask_user" && tool.answers?.length) {
    return "answers"
  }
  return "output"
}
