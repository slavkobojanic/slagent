import { makeAutoObservable } from "mobx"
import type { ChatSummary, ProjectSummary } from "@shared/types"
import type { ChatGroupView, ChatListItem } from "@/features/mobile/chat-list/chat-list-items"
import { orderedChats } from "@/features/library/library-utils"
import { canShowLess, visibleChats } from "@/features/library/sidebar/open-project/chat-list/chat-list-utils"
import type { LibraryStore } from "@/mirror/library-store/library-store"

const CHATS_GROUP_ID = "chats"

// Chats without a folder first, as one "No project" group like the desktop sidebar, then every code project by name.
// Each group shows as many chats as the desktop sidebar does before "Show N more", and the rest stay one tap away.
export class MobileChatListStore {
  // Groups whose whole list is showing, keyed by group id.
  readonly showAllGroups: Record<string, boolean> = {}

  constructor(private readonly libraryStore: LibraryStore) {
    makeAutoObservable(this)
  }

  get groups(): ChatGroupView[] {
    const projects = this.libraryStore.library.projects
    const chatProjects = projects.filter((project) => (project.mode ?? "code") === "chat")
    const codeProjects = projects.filter((project) => (project.mode ?? "code") === "code").sort((left, right) => left.name.localeCompare(right.name))
    const groups: ChatGroupView[] = []
    if (chatProjects.length > 0) {
      groups.push(this.viewOf(CHATS_GROUP_ID, "No project", null, this.itemsOf(chatProjects)))
    }
    for (const project of codeProjects) {
      groups.push(this.viewOf(project.id, project.name, project.id, this.itemsOf([project])))
    }
    return groups
  }

  get empty(): boolean {
    if (this.libraryStore.library.projects.length > 0) {
      return false
    }
    return true
  }

  showAllOf(groupId: string): boolean {
    return this.showAllGroups[groupId] ?? false
  }

  toggleShowAll(groupId: string): void {
    this.showAllGroups[groupId] = !this.showAllOf(groupId)
  }

  private viewOf(id: string, name: string, newChatProjectId: string | null, items: ChatListItem[]): ChatGroupView {
    const showAll = this.showAllOf(id)
    const visible = visibleChats(items, showAll)
    return { id, name, newChatProjectId, items: visible, hiddenCount: items.length - visible.length, showAll, canShowLess: canShowLess(items.length, showAll) }
  }

  private itemsOf(projects: ProjectSummary[]): ChatListItem[] {
    const projectOf = new Map<string, string>()
    const chats: ChatSummary[] = []
    for (const project of projects) {
      for (const chat of this.chatsOf(project.id)) {
        projectOf.set(chat.id, project.id)
        chats.push(chat)
      }
    }
    return orderedChats(chats).map((chat) => ({ chat, projectId: projectOf.get(chat.id) ?? "", status: chat.status }))
  }

  // The open project's chats live in `chats`; the other projects' in `chatsByProject`.
  private chatsOf(projectId: string): ChatSummary[] {
    const library = this.libraryStore.library
    if (projectId === library.openProjectId) {
      return library.chats
    }
    return library.chatsByProject[projectId] ?? []
  }
}
