import { makeAutoObservable } from "mobx"
import type { TaskEntry } from "@shared/types"
import { projectColorValue } from "@shared/project-appearance"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import type { TerminalStore } from "@/features/terminal/terminal-store/terminal-store"

export type StatusTerminal = {
  id: string
  title: string
  exited: boolean
  origin: "user" | "task"
  color: string | null
}

export type StatusTask = {
  id: string
  label: string
  status: TaskEntry["status"]
  statusText: string
  projectName: string
  color: string | null
  exitCode: number | null
}

// One thin bar over every terminal: the user's shell tabs and the background
// tasks each chat's agent started. Terminals come from the drawer's store,
// tasks from the mirrored library state.
export class StatusBarStore {
  // The task the viewer shows. A snapshot, so the viewer keeps its title when
  // the task leaves the list.
  viewing: TaskEntry | null = null
  output = ""
  error: string | null = null
  now = Date.now()

  constructor(
    private readonly terminalTabs: TerminalStore,
    private readonly library: LibraryStore,
  ) {
    makeAutoObservable(this)
  }

  get terminals(): StatusTerminal[] {
    const color = projectColorValue(this.library.library.projects.find((project) => project.id === this.library.library.openProjectId)?.color)
    return this.terminalTabs.tabs.map((tab) => ({
      id: tab.id,
      title: tab.title,
      exited: tab.exited,
      origin: tab.origin,
      color,
    }))
  }

  get tasks(): StatusTask[] {
    const colors = new Map(this.library.library.projects.map((project) => [project.id, projectColorValue(project.color)]))
    const names = new Map(this.library.library.projects.map((project) => [project.id, project.name]))
    return this.library.library.tasks.map((task) => ({
      id: task.id,
      label: task.label,
      status: task.status,
      statusText: statusLabel(task, this.now),
      projectName: names.get(task.projectId) ?? task.projectId,
      color: colors.get(task.projectId) ?? null,
      exitCode: task.exitCode,
    }))
  }

  get viewingId(): string | null {
    if (this.viewing === null) {
      return null
    }
    return this.viewing.id
  }

  get outputText(): string {
    if (this.output === "") {
      return "No output yet."
    }
    return this.output
  }

  get anyRunning(): boolean {
    return this.library.library.tasks.some((task) => task.status === "running")
  }

  // Whether the drawer has the shell a task id owns.
  hasTerminal(id: string): boolean {
    return this.terminalTabs.tabs.some((tab) => tab.id === id)
  }

  task(id: string): TaskEntry | null {
    return this.library.library.tasks.find((task) => task.id === id) ?? null
  }

  setViewing(task: TaskEntry | null) {
    this.viewing = task
  }

  setOutput(text: string) {
    this.output = text
  }

  setError(message: string | null) {
    this.error = message
  }

  setNow(value: number) {
    this.now = value
  }
}

function statusLabel(task: TaskEntry, now: number): string {
  if (task.status === "running") {
    return elapsed(now - task.startedAt)
  }
  if (task.status === "done") {
    return "done"
  }
  if (task.status === "stopped") {
    return "stopped"
  }
  return `exit ${task.exitCode ?? "?"}`
}

function elapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) {
    return `${seconds}s`
  }
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes}m`
  }
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}
