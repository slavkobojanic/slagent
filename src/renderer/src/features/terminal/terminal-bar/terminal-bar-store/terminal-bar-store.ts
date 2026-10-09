import { makeAutoObservable } from "mobx"
import type { TaskEntry } from "@shared/types"
import { projectColorValue } from "@shared/project-appearance"
import type { LibraryStore } from "@/mirror/library-store/library-store"
import type { TerminalStore } from "@/features/terminal/terminal-store/terminal-store"

// One chip along the bottom edge per terminal: the user's shells and the
// agent's task shells in a single list. A task whose shell is not in the
// drawer yet still gets a chip, so the bar shows every terminal there is.
export class TerminalBarStore {
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
    const openColour = colours.get(this.library.library.openProjectId ?? "") ?? null
    const chips: TerminalChip[] = this.terminalTabs.tabs.map((tab) => ({
      id: tab.id,
      title: tab.title,
      active: tab.id === this.terminalTabs.activeId,
      exited: tab.exited,
      origin: tab.origin,
      color: tab.origin === "task" ? colours.get(this.taskFor(tab.id)?.projectId ?? "") ?? openColour : openColour,
    }))
    for (const task of this.library.library.tasks) {
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
