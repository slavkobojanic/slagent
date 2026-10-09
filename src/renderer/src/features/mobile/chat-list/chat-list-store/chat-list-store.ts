import { makeAutoObservable } from "mobx"
import type { ChatSummary, ProjectSummary } from "@shared/types"
import type { ChatGroup, ChatListItem } from "@/features/mobile/chat-list/chat-list-items"
import { orderedChats } from "@/features/library/library-utils"
import type { LibraryStore } from "@/mirror/library-store/library-store"

const CHATS_GROUP_ID = "chats"

// Chats without a folder first, as one "No project" group like the desktop sidebar, then every code project by name.
export class MobileChatListStore {
  constructor(private readonly libraryStore: LibraryStore) {
    makeAutoObservable(this)
  }

  get groups(): ChatGroup[] {
    const projects = this.libraryStore.library.projects
    const chatProjects = projects.filter((project) => (project.mode ?? "code") === "chat")
    const codeProjects = projects.filter((project) => (project.mode ?? "code") === "code").sort((left, right) => left.name.localeCompare(right.name))
    const groups: ChatGroup[] = []
    if (chatProjects.length > 0) {
      groups.push({ id: CHATS_GROUP_ID, name: "No project", newChatProjectId: null, items: this.itemsOf(chatProjects) })
    }
    for (const project of codeProjects) {
      groups.push({ id: project.id, name: project.name, newChatProjectId: project.id, items: this.itemsOf([project]) })
    }
    return groups
  }

  get empty(): boolean {
    if (this.libraryStore.library.projects.length > 0) {
      return false
    }
    return true
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
