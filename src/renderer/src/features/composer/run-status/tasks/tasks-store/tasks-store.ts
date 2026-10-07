import { makeAutoObservable } from "mobx"
import type { TaskInfo } from "@shared/types"
import type { RunStore } from "@/mirror/run-store/run-store"

export type TaskRow = {
  id: string
  label: string
  command: string
  status: TaskInfo["status"]
  statusText: string
}

export class TasksStore {
  // The task the dialog shows. A snapshot, so the dialog keeps its title if the run drops the task.
  viewing: TaskInfo | null = null
  output = ""
  error: string | null = null
  now = Date.now()

  constructor(private readonly run: RunStore) {
    makeAutoObservable(this)
  }

  get anyRunning(): boolean {
    return this.run.tasks.some((task) => task.status === "running")
  }

  // Only work still going belongs above the composer. A finished task's result already
  // reached the transcript, so its chip is cleared the moment it ends.
  get chips(): TaskRow[] {
    return this.run.tasks.filter((task) => task.status === "running").map((task) => toRow(task, this.now))
  }

  get current(): TaskRow | null {
    if (this.viewing === null) {
      return null
    }
    const viewed = this.viewing
    const task = this.run.tasks.find((candidate) => candidate.id === viewed.id) ?? viewed
    return toRow(task, this.now)
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

  openTask(id: string) {
    this.viewing = this.run.tasks.find((task) => task.id === id) ?? null
  }

  closeTask() {
    this.viewing = null
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

function toRow(task: TaskInfo, now: number): TaskRow {
  return {
    id: task.id,
    label: task.label,
    command: task.command,
    status: task.status,
    statusText: statusLabel(task, now),
  }
}

function statusLabel(task: TaskInfo, now: number): string {
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
