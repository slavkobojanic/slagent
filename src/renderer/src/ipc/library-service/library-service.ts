import type { ChatSearchResult, SlagentApi } from "@shared/types"

export interface LibraryService {
  openProject(projectId: string): Promise<void>
  // messageId opens the chat scrolled to that message instead of the bottom.
  openChat(chatId: string, projectId?: string, messageId?: string): Promise<void>
  searchChats(query: string): Promise<ChatSearchResult[]>
  pinProject(projectId: string, pinned: boolean): Promise<void>
  pinChat(chatId: string, pinned: boolean): Promise<void>
  renameChat(chatId: string, title: string): Promise<void>
  deleteChat(chatId: string): Promise<void>
  removeProject(projectId: string, typedName: string): Promise<void>
  chooseFolder(): Promise<void>
}

export class IpcLibraryService implements LibraryService {
  constructor(private readonly api: SlagentApi) {}

  openProject = (projectId: string) => this.api.openProject(projectId)
  openChat = (chatId: string, projectId?: string, messageId?: string) =>
    this.api.openChat(chatId, projectId, messageId)
  searchChats = (query: string) => this.api.searchChats(query)
  pinProject = (projectId: string, pinned: boolean) => this.api.pinProject(projectId, pinned)
  pinChat = (chatId: string, pinned: boolean) => this.api.pinChat(chatId, pinned)
  renameChat = (chatId: string, title: string) => this.api.renameChat(chatId, title)
  deleteChat = (chatId: string) => this.api.deleteChat(chatId)
  removeProject = (projectId: string, typedName: string) => this.api.removeProject(projectId, typedName)
  chooseFolder = () => this.api.chooseFolder()
}
