import { makeAutoObservable } from "mobx"
import type { TaskEntry } from "@shared/types"
import { projectColorValue } from "@shared/project-appearance"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import type { TerminalStore } from "@/features/terminal/terminal-store/terminal-store"

// One chip along the bottom edge per terminal: the user's shells and the
// agent's task shells in a single list. A task whose shell is not in the
// drawer yet still gets a chip, so the bar shows every terminal there is.
export class TerminalBarStore {
  // Task chips the user closed: the bar re-derives task chips from the library
  // on every read, so a closed one needs a place to stay closed.
  private readonly dismissed = new Set<string>()

  constructor(
    private readonly terminalTabs: TerminalStore,
    private readonly library: LibraryStore,
  ) {
    makeAutoObservable(this)
  }

  get open(): boolean {
    return this.terminalTabs.open
  }

  get canCreate(): boolean {
    return this.terminalTabs.canCreate
  }

  get chips(): TerminalChip[] {
    const colours = new Map(this.library.library.projects.map((project) => [project.id, projectColorValue(project.color)]))
    // A shell the user started belongs to no project, so it stays neutral; a
    // task's shell carries its own project's colour.
    const chips: TerminalChip[] = this.terminalTabs.tabs.map((tab) => ({
      id: tab.id,
      title: tab.title,
      active: tab.id === this.terminalTabs.activeId,
      exited: tab.exited,
      origin: tab.origin,
      color: tab.origin === "task" ? colours.get(this.taskFor(tab.id)?.projectId ?? "") ?? null : null,
    }))
    for (const task of this.library.library.tasks) {
      if (this.dismissed.has(task.id)) continue
      if (this.terminalTabs.tabs.some((tab) => tab.id === task.id)) continue
      chips.push({
        id: task.id,
        title: task.label,
        active: false,
        exited: task.status !== "running",
        origin: "task",
        color: colours.get(task.projectId) ?? null,
      })
    }
    return chips
  }

  // Whether the drawer has the shell a task id owns.
  hasTerminal(id: string): boolean {
    return this.terminalTabs.tabs.some((tab) => tab.id === id)
  }

  task(id: string): TaskEntry | null {
    return this.library.library.tasks.find((task) => task.id === id) ?? null
  }

  // Closing a task chip only hides it: its shell keeps running in the main
  // process, and the composer's task strip still shows the task itself.
  dismissTask(id: string) {
    this.dismissed.add(id)
  }

  private taskFor(id: string): TaskEntry | undefined {
    return this.library.library.tasks.find((task) => task.id === id)
  }
}

export type TerminalChip = {
  id: string
  title: string
  active: boolean
  exited: boolean
  origin: "user" | "task"
  color: string | null
}
