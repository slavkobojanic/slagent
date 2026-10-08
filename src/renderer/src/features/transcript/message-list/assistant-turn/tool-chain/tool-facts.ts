import type { AnsweredQuestion, SubagentRunState, ToolMessage } from "@shared/types"
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
export type StepLabel = { kind: "text"; text: string } | { kind: "file"; name: string; path: string }

export function toolLabel(tool: ToolMessage): StepLabel {
  if (tool.name === "bash") {
    return { kind: "text", text: bashLabel(tool) }
  }
  if (tool.name === "ask_user") {
    return { kind: "text", text: questionLabel(tool) }
  }
  if (tool.name === "subagent") {
    return { kind: "text", text: subagentLabel(tool) }
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

function subagentLabel(tool: ToolMessage): string {
  try {
    const args = JSON.parse(tool.args) as { agent?: unknown; task?: unknown; tasks?: unknown[] }
    const agents = new Set<string>()
    let tasks = 0
    if (typeof args.agent === "string" && args.agent) agents.add(args.agent)
    if (typeof args.task === "string" && args.task) tasks += 1
    if (Array.isArray(args.tasks)) {
      for (const item of args.tasks) {
        const agent = (item as { agent?: unknown } | null)?.agent
        if (typeof agent === "string" && agent) agents.add(agent)
      }
      tasks += args.tasks.length
    }
    if (tasks === 0) return tool.label
    const names = [...agents].join(", ")
    return tasks > 1 ? `subagent: ${tasks} tasks to ${names}` : `subagent: ${names}`
  } catch {
    return tool.label
  }
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

// Which body a step shows: the bash terminal, the answers to a question, the live subagent
// runs, or the plain output.
export type ToolOutputKind = "bash" | "answers" | "subagent" | "output"

export type StepOutput =
  | { kind: "bash"; command: string; output: string; running: boolean; isError: boolean }
  | { kind: "answers"; answers: AnsweredQuestion[] }
  | { kind: "subagent"; runs: SubagentRunState[]; running: boolean }
  | { kind: "output"; images: string[]; output: string; isError: boolean }

export function toolOutputKind(tool: ToolMessage): ToolOutputKind {
  if (tool.name === "bash") {
    return "bash"
  }
  if (tool.name === "ask_user" && tool.answers?.length) {
    return "answers"
  }
  if (tool.name === "subagent" && tool.subagent?.length) {
    return "subagent"
  }
  return "output"
}

export function toolStepOutput(tool: ToolMessage): StepOutput {
  const kind = toolOutputKind(tool)
  if (kind === "bash") {
    return { kind, command: bashCommand(tool), output: tool.output, running: tool.running, isError: tool.isError }
  }
  if (kind === "answers") {
    return { kind, answers: tool.answers ?? [] }
  }
  if (kind === "subagent") {
    return { kind, runs: tool.subagent ?? [], running: tool.running }
  }
  return { kind, images: tool.images ?? [], output: tool.output, isError: tool.isError }
}
