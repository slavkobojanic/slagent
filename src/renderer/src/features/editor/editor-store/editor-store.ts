import { makeAutoObservable } from "mobx"

export type EditorStatus = "idle" | "loading" | "ready" | "failed"

export type EditorTab = {
  // The project-relative path shown in the tab; absolutePath is the identity.
  path: string
  absolutePath: string
  savedContents: string
  mtime: number
  dirty: boolean
  saving: boolean
  // Set when the file changed on disk after it was opened, with the mtime found there.
  conflictMtime: number | null
  error: string | null
}

export class EditorStore {
  status: EditorStatus = "idle"
  error: string | null = null
  tabs: EditorTab[] = []
  activePath: string | null = null
  // The tab waiting on a keep-or-discard answer before it closes with unsaved edits.
  closing: string | null = null
  notice: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  get activeTab(): EditorTab | null {
    return this.tabs.find((tab) => tab.absolutePath === this.activePath) ?? null
  }

  get hasDirty(): boolean {
    return this.tabs.some((tab) => tab.dirty)
  }

  tab(absolutePath: string): EditorTab | null {
    return this.tabs.find((tab) => tab.absolutePath === absolutePath) ?? null
  }

  setStatus(status: EditorStatus, error: string | null = null) {
    this.status = status
    this.error = error
  }

  setNotice(notice: string | null) {
    this.notice = notice
  }

  addTab(file: { path: string; absolutePath: string; contents: string; mtime: number }) {
    this.tabs.push({
      path: file.path,
      absolutePath: file.absolutePath,
      savedContents: file.contents,
      mtime: file.mtime,
      dirty: false,
      saving: false,
      conflictMtime: null,
      error: null,
    })
    this.activePath = file.absolutePath
    this.notice = null
  }

  setActive(absolutePath: string) {
    this.activePath = absolutePath
  }

  removeTab(absolutePath: string) {
    const index = this.tabs.findIndex((tab) => tab.absolutePath === absolutePath)
    if (index === -1) {
      return
    }
    this.tabs.splice(index, 1)
    if (this.closing === absolutePath) {
      this.closing = null
    }
    if (this.activePath !== absolutePath) {
      return
    }
    // Land on the tab that slid into this slot, or the last one.
    const next = this.tabs[index] ?? this.tabs[this.tabs.length - 1]
    this.activePath = next?.absolutePath ?? null
  }

  setDirty(absolutePath: string, dirty: boolean) {
    const tab = this.tab(absolutePath)
    if (tab) {
      tab.dirty = dirty
    }
  }

  setSaving(absolutePath: string, saving: boolean) {
    const tab = this.tab(absolutePath)
    if (tab) {
      tab.saving = saving
    }
  }

  setSaved(absolutePath: string, contents: string, mtime: number) {
    const tab = this.tab(absolutePath)
    if (!tab) {
      return
    }
    tab.savedContents = contents
    tab.mtime = mtime
    tab.dirty = false
    tab.conflictMtime = null
    tab.error = null
  }

  setConflict(absolutePath: string, mtime: number | null) {
    const tab = this.tab(absolutePath)
    if (tab) {
      tab.conflictMtime = mtime
    }
  }

  setTabError(absolutePath: string, error: string | null) {
    const tab = this.tab(absolutePath)
    if (tab) {
      tab.error = error
    }
  }

  setClosing(absolutePath: string | null) {
    this.closing = absolutePath
  }
}
