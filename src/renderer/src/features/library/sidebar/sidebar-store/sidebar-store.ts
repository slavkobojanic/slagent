import { makeAutoObservable, observableRef } from "mobx"
import type { ChatSearchResult } from "@shared/types"

// What the sidebar shows beyond the library: the search, the chat being renamed, which row menu is open,
// which projects are collapsed, the clock for the done dot, and the motion preference.
export class SidebarStore {
  query = ""
  // Null while the query is blank. Otherwise the last matches, which stay until new ones arrive.
  results: ChatSearchResult[] | null = null
  renamingId: string | null = null
  draft = ""
  // The chat whose row menu is open. Only the context menu and the "..." button open a row menu.
  menuChatId: string | null = null
  collapsed: Record<string, boolean> = {}
  showAll = false
  // Milliseconds. The presenter moves it so a done chat falls back to idle on time.
  now = 0
  reduceMotion = false

  constructor() {
    makeAutoObservable(this, { results: observableRef, collapsed: observableRef })
  }

  setQuery(value: string) {
    this.query = value
  }

  setResults(value: ChatSearchResult[] | null) {
    this.results = value
  }

  startRename(chatId: string, title: string) {
    this.renamingId = chatId
    this.draft = title
  }

  setDraft(value: string) {
    this.draft = value
  }

  endRename() {
    this.renamingId = null
  }

  setMenuChatId(chatId: string | null) {
    this.menuChatId = chatId
  }

  isCollapsed(projectId: string): boolean {
    return this.collapsed[projectId] === true
  }

  setCollapsed(projectId: string, value: boolean) {
    this.collapsed = { ...this.collapsed, [projectId]: value }
  }

  setShowAll(value: boolean) {
    this.showAll = value
  }

  setNow(value: number) {
    this.now = value
  }

  setReduceMotion(value: boolean) {
    this.reduceMotion = value
  }
}
