import { makeAutoObservable } from "mobx"
import type { TerminalSession } from "@shared/types"

// A tab in the terminal drawer. An exited shell keeps its output until the user
// closes the tab, so the flag only changes how the tab looks. Tabs sharing a
// groupId are split panes: they render side by side in the drawer and their
// chips join into one group element in the bar.
export type TerminalTab = {
  id: string
  title: string
  cwd: string
  exited: boolean
  // Who created it: "user" tabs come from the + button, "task" tabs from the
  // status bar for a background task's shell.
  origin: "user" | "task"
  groupId: string | null
  // A title the user typed wins over every title the shell reports.
  customTitle: boolean
}

// How much of the group's width the first pane takes, clamped so one pane can
// never squeeze the other away.
export const MIN_SPLIT_RATIO = 0.2
export const MAX_SPLIT_RATIO = 0.8

export class TerminalStore {
  open = false
  tabs: TerminalTab[] = []
  activeId: string | null = null
  busy = false
  error: string | null = null
  renamingId: string | null = null
  renameDraft = ""

  // How much of the group's width the first pane takes, clamped so one pane
  // can never squeeze the other away.
  private groupCount = 0
  private ratios = new Map<string, number>()

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

  get canSplit(): boolean {
    return this.open && this.activeId !== null && !this.busy
  }

  get canRename(): boolean {
    return this.open && this.activeId !== null
  }

  // Every tab that shares the active tab's group, in tab order; the drawer
  // renders these side by side.
  get activeGroup(): TerminalTab[] {
    const active = this.active
    if (active === null || active.groupId === null) {
      return active === null ? [] : [active]
    }
    return this.tabs.filter((tab) => tab.groupId === active.groupId)
  }

  splitRatio(groupId: string): number {
    return this.ratios.get(groupId) ?? 0.5
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

  addTab(session: TerminalSession, origin: "user" | "task" = "user", groupId: string | null = null) {
    this.tabs = [
      ...this.tabs,
      { id: session.id, title: session.title, cwd: session.cwd, exited: false, origin, groupId, customTitle: false },
    ]
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
    if (this.renamingId === id) {
      this.cancelRename()
    }
    if (this.activeId !== id) {
      return
    }
    const next = this.tabs[index] ?? this.tabs[index - 1] ?? null
    this.activeId = next === null ? null : next.id
  }

  setTitle(id: string, title: string) {
    const tab = this.tabs.find((item) => item.id === id)
    if (tab === undefined || tab.customTitle || title.trim() === "") {
      return
    }
    tab.title = title.trim()
  }

  // Splits the tab to the right of another: both join a new group. A tab that
  // is already grouped takes the new pane into its own group.
  groupWith(leader: string, follower: string) {
    const group = this.tabs.find((tab) => tab.id === leader)?.groupId ?? `g${++this.groupCount}`
    for (const tab of this.tabs) {
      if (tab.id === leader || tab.id === follower) {
        tab.groupId = group
      }
    }
  }

  setSplitRatio(groupId: string, ratio: number) {
    const clamped = Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, ratio))
    if (Number.isNaN(clamped)) {
      return
    }
    this.ratios.set(groupId, clamped)
  }

  setRenaming(id: string | null) {
    this.renamingId = id
    this.renameDraft = id === null ? "" : this.tabs.find((tab) => tab.id === id)?.title ?? ""
  }

  setRenameDraft(value: string) {
    this.renameDraft = value
  }

  // A blank name keeps the current one, so a stray Enter cannot blank the tab.
  renameTab(id: string, title: string) {
    const tab = this.tabs.find((item) => item.id === id)
    if (tab !== undefined && title.trim() !== "") {
      tab.title = title.trim()
      tab.customTitle = true
    }
    this.setRenaming(null)
  }

  cancelRename() {
    this.setRenaming(null)
  }

  setExited(id: string) {
    const tab = this.tabs.find((item) => item.id === id)
    if (tab === undefined) {
      return
    }
    tab.exited = true
  }
}
