import { makeAutoObservable } from "mobx"
import type { TerminalSession } from "@shared/types"

// A tab in the terminal drawer. An exited shell keeps its output until the user
// closes the tab, so the flag only changes how the tab looks.
export type TerminalTab = {
  id: string
  title: string
  cwd: string
  exited: boolean
  // Who created it: "user" tabs come from the + button, "task" tabs from the
  // status bar for a background task's shell.
  origin: "user" | "task"
}

export class TerminalStore {
  open = false
  tabs: TerminalTab[] = []
  activeId: string | null = null
  busy = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  get active(): TerminalTab | null {
    return this.tabs.find((tab) => tab.id === this.activeId) ?? null
  }

  get empty(): boolean {
    return this.tabs.length === 0
  }

  get canCreate(): boolean {
    if (this.busy) {
      return false
    }
    return true
  }

  setOpen(open: boolean) {
    this.open = open
  }

  setActive(id: string) {
    this.activeId = id
  }

  setBusy(value: boolean) {
    this.busy = value
  }

  setError(message: string | null) {
    this.error = message
  }

  addTab(session: TerminalSession, origin: "user" | "task" = "user") {
    this.tabs = [...this.tabs, { id: session.id, title: session.title, cwd: session.cwd, exited: false, origin }]
    this.activeId = session.id
    this.error = null
  }

  // Shows an existing tab and opens the drawer over it, so the status bar can
  // reveal a terminal the agent created.
  revealTab(id: string) {
    if (!this.tabs.some((tab) => tab.id === id)) {
      return
    }
    this.open = true
    this.activeId = id
  }

  removeTab(id: string) {
    const index = this.tabs.findIndex((tab) => tab.id === id)
    if (index < 0) {
      return
    }
    this.tabs = this.tabs.filter((tab) => tab.id !== id)
    if (this.activeId !== id) {
      return
    }
    const next = this.tabs[index] ?? this.tabs[index - 1] ?? null
    this.activeId = next === null ? null : next.id
  }

  setTitle(id: string, title: string) {
    const tab = this.tabs.find((item) => item.id === id)
    if (tab === undefined || title.trim() === "") {
      return
    }
    tab.title = title.trim()
  }

  setExited(id: string) {
    const tab = this.tabs.find((item) => item.id === id)
    if (tab === undefined) {
      return
    }
    tab.exited = true
  }
}
