import { randomUUID } from "node:crypto"
import { mkdir, readFile, realpath, rename, rm, stat, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { basename, dirname, join } from "node:path"
import type { ChatMessage } from "../shared/types"
import { SearchIndex, type SearchHit } from "./search-index"

export type StoredProject = {
  id: string
  path: string
  name: string
  // Absent means "code". Chat projects keep their cwd inside the library root.
  mode?: "chat"
  pinned: boolean
  pinnedAt: number
  lastOpenedAt: number
  openChatId: string | null
  // Sidebar icon id from the appearance catalog; absent means no icon.
  icon?: string
  // Accent colour for the icon and the project's terminals; absent means the app default.
  color?: string
}

export type StoredChat = {
  id: string
  title: string
  pinned: boolean
  pinnedAt: number
  updatedAt: number
  createdAt: number
  modelId: string | null
  sessionFile: string | null
  // The Claude Code session a Claude Code chat resumes.
  claudeSessionId?: string
  named: boolean
  titleCustom: boolean
  titleGenerated?: boolean
  unread?: boolean
  // A proposed plan waiting for review, kept so a crash or restart shows it again.
  planProposal?: string
  // When the last run finished without an error or a pending question.
  finishedAt?: number
  tokens?: number
  cost?: number
}

type IndexFile = {
  openProjectId: string | null
  projects: StoredProject[]
}

type ProjectFile = {
  chats: StoredChat[]
}

const emptyIndex: IndexFile = { openProjectId: null, projects: [] }

export class Library {
  private index: IndexFile = emptyIndex
  private chats = new Map<string, StoredChat[]>()
  private search: SearchIndex | null = null

  constructor(private readonly root: string) {}

  async load(): Promise<void> {
    this.index = await readJson<IndexFile>(join(this.root, "index.json"), emptyIndex)
    if (!Array.isArray(this.index.projects)) this.index = emptyIndex
    this.chats.clear()
    for (const project of this.index.projects) {
      const file = await readJson<ProjectFile>(this.projectFile(project.id), { chats: [] })
      const chats = Array.isArray(file.chats) ? file.chats : []
      this.chats.set(project.id, chats)
    }
    if (!this.search) {
      await mkdir(this.root, { recursive: true })
      this.search = new SearchIndex(join(this.root, "search.db"))
    }
  }

  searchMessages(terms: string[]): SearchHit[] {
    return this.search?.search(terms) ?? []
  }

  // Indexes chats the search index hasn't seen, such as every chat on the
  // first launch with search, and drops chats that no longer exist. Yields
  // between transcripts so the app stays responsive.
  async indexMissingChats(): Promise<void> {
    const search = this.search
    if (!search) return
    const indexed = search.indexedChats()
    const live = new Set<string>()
    for (const project of this.index.projects) {
      for (const chat of this.projectChats(project.id)) {
        live.add(chat.id)
        if (indexed.has(chat.id)) continue
        const messages = await this.readTranscript(project.id, chat.id)
        // A transcript write may have indexed the chat while this one read.
        if (!this.chat(project.id, chat.id) || search.hasChat(chat.id)) continue
        this.indexSafely(() => search.indexChat(project.id, chat.id, messages))
      }
    }
    for (const chatId of indexed.keys()) {
      if (!live.has(chatId)) this.indexSafely(() => search.removeChat(chatId))
    }
  }

  get openProjectId(): string | null {
    return this.index.openProjectId
  }

  projects(): StoredProject[] {
    return this.index.projects
  }

  project(id: string): StoredProject | null {
    return this.index.projects.find((item) => item.id === id) ?? null
  }

  projectChats(projectId: string): StoredChat[] {
    return this.chats.get(projectId) ?? []
  }

  chat(projectId: string, chatId: string): StoredChat | null {
    const chats = this.chats.get(projectId) ?? []
    return chats.find((item) => item.id === chatId) ?? null
  }

  async ensureProject(folder: string): Promise<StoredProject> {
    const resolved = await assertDirectory(folder)
    const existing = this.index.projects.find((item) => item.path === resolved)
    if (existing) return existing
    const project: StoredProject = {
      id: randomUUID(),
      path: resolved,
      name: basename(resolved),
      pinned: false,
      pinnedAt: 0,
      lastOpenedAt: Date.now(),
      openChatId: null,
    }
    this.index.projects.push(project)
    this.chats.set(project.id, [])
    await this.writeIndex()
    await this.writeProject(project.id)
    return project
  }

  // Chat projects have no folder on disk the user picked: the app owns a
  // directory under the library root as their cwd.
  async ensureChatProject(): Promise<StoredProject> {
    const project: StoredProject = {
      id: randomUUID(),
      path: "",
      name: "New chat",
      mode: "chat",
      pinned: false,
      pinnedAt: 0,
      lastOpenedAt: Date.now(),
      openChatId: null,
    }
    project.path = this.chatProjectDir(project.id)
    await mkdir(project.path, { recursive: true })
    this.index.projects.push(project)
    this.chats.set(project.id, [])
    await this.writeIndex()
    await this.writeProject(project.id)
    return project
  }

  async setProjectName(id: string, name: string): Promise<void> {
    const project = this.project(id)
    if (!project) return
    project.name = name
    await this.writeIndex()
  }

  async touchProject(id: string, openChatId: string | null): Promise<void> {
    const project = this.project(id)
    if (!project) return
    project.lastOpenedAt = Date.now()
    project.openChatId = openChatId
    this.index.openProjectId = id
    await this.writeIndex()
  }

  async setOpenProject(id: string | null): Promise<void> {
    this.index.openProjectId = id
    await this.writeIndex()
  }

  async setPinned(id: string, pinned: boolean): Promise<void> {
    const project = this.project(id)
    if (!project) return
    project.pinned = pinned
    if (pinned) project.pinnedAt = Date.now()
    await this.writeIndex()
  }

  async setAppearance(id: string, icon: string | null, color: string | null): Promise<void> {
    const project = this.project(id)
    if (!project) return
    if (icon === null) delete project.icon
    else project.icon = icon
    if (color === null) delete project.color
    else project.color = color
    await this.writeIndex()
  }

  async rememberChat(projectId: string, openChatId: string | null): Promise<void> {
    const project = this.project(projectId)
    if (!project) return
    project.openChatId = openChatId
    await this.writeIndex()
  }

  async createChat(projectId: string, modelId: string | null): Promise<StoredChat> {
    const chat: StoredChat = {
      id: randomUUID(),
      title: "New chat",
      pinned: false,
      pinnedAt: 0,
      updatedAt: Date.now(),
      createdAt: Date.now(),
      modelId,
      sessionFile: null,
      named: false,
      titleCustom: false,
      titleGenerated: false,
    }
    const chats = this.chats.get(projectId) ?? []
    chats.unshift(chat)
    this.chats.set(projectId, chats)
    await mkdir(this.chatDir(projectId, chat.id), { recursive: true })
    await this.writeProject(projectId)
    return chat
  }

  async updateChat(projectId: string, chatId: string, patch: Partial<StoredChat>): Promise<void> {
    const chat = this.chat(projectId, chatId)
    if (!chat) return
    Object.assign(chat, patch)
    await this.writeProject(projectId)
  }

  // Bumps the chat in memory so the sidebar can order it by the latest user
  // message. The caller persists it with saveProject alongside the transcript
  // write instead of touching the project file per message.
  touchChat(projectId: string, chatId: string, at: number): boolean {
    const chat = this.chat(projectId, chatId)
    if (!chat || at <= chat.updatedAt) return false
    chat.updatedAt = at
    return true
  }

  async saveProject(projectId: string): Promise<void> {
    await this.writeProject(projectId)
  }

  async setChatPinned(projectId: string, chatId: string, pinned: boolean): Promise<void> {
    const chat = this.chat(projectId, chatId)
    if (!chat) return
    chat.pinned = pinned
    if (pinned) chat.pinnedAt = Date.now()
    await this.writeProject(projectId)
  }

  async deleteChat(projectId: string, chatId: string): Promise<void> {
    const chats = this.chats.get(projectId) ?? []
    const chat = chats.find((item) => item.id === chatId)
    this.chats.set(
      projectId,
      chats.filter((item) => item.id !== chatId),
    )
    await this.writeProject(projectId)
    await rm(this.chatDir(projectId, chatId), { recursive: true, force: true })
    if (chat?.sessionFile) await rm(chat.sessionFile, { force: true })
    this.indexSafely((search) => search.removeChat(chatId))
    const project = this.project(projectId)
    if (project?.openChatId === chatId) {
      project.openChatId = null
      await this.writeIndex()
    }
  }

  async removeProject(id: string): Promise<void> {
    const project = this.project(id)
    if (!project) return
    if (project.mode === "chat") {
      // The cwd lives inside the library root; just drop it. The app-owned
      // projectDir (sessions, chats, transcripts) is removed below as usual.
      await rm(project.path, { recursive: true, force: true })
    } else {
      await deleteProjectFolder(project.path)
    }
    this.index.projects = this.index.projects.filter((item) => item.id !== id)
    this.chats.delete(id)
    if (this.index.openProjectId === id) this.index.openProjectId = null
    await this.writeIndex()
    await rm(this.projectDir(id), { recursive: true, force: true })
    this.indexSafely((search) => search.removeProject(id))
  }

  async readTranscript(projectId: string, chatId: string): Promise<ChatMessage[]> {
    const file = join(this.chatDir(projectId, chatId), "transcript.json")
    const parsed = await readJson<{ messages?: ChatMessage[] }>(file, { messages: [] })
    if (!Array.isArray(parsed.messages)) return []
    return parsed.messages
  }

  async writeTranscript(projectId: string, chatId: string, messages: ChatMessage[]): Promise<void> {
    const file = join(this.chatDir(projectId, chatId), "transcript.json")
    await writeJson(file, { messages })
    if (this.chat(projectId, chatId)) this.indexSafely((search) => search.indexChat(projectId, chatId, messages))
  }

  sessionDir(projectId: string): string {
    return join(this.projectDir(projectId), "sessions")
  }

  checkpointDir(projectId: string): string {
    return join(this.projectDir(projectId), "checkpoints.git")
  }

  attachmentDir(projectId: string, chatId: string): string {
    return join(this.chatDir(projectId, chatId), "attachments")
  }

  attachmentUrl(projectId: string, chatId: string, file: string): string {
    return `slagent://attachment/${projectId}/${chatId}/${encodeURIComponent(file)}`
  }

  private projectDir(projectId: string): string {
    return join(this.root, "projects", projectId)
  }

  private chatProjectDir(projectId: string): string {
    return join(this.root, "chat", projectId)
  }

  private projectFile(projectId: string): string {
    return join(this.projectDir(projectId), "project.json")
  }

  private chatDir(projectId: string, chatId: string): string {
    return join(this.projectDir(projectId), "chats", chatId)
  }

  // Search is a convenience; a failing index must never block saving a chat.
  private indexSafely(work: (search: SearchIndex) => void): void {
    if (!this.search) return
    try {
      work(this.search)
    } catch (error) {
      console.error("search index:", error)
    }
  }

  private async writeProject(projectId: string): Promise<void> {
    const chats = this.chats.get(projectId) ?? []
    await writeJson(this.projectFile(projectId), { chats })
  }

  private async writeIndex(): Promise<void> {
    await writeJson(join(this.root, "index.json"), this.index)
  }
}

export async function assertDirectory(folder: string): Promise<string> {
  const resolved = await realpath(folder)
  const info = await stat(resolved)
  if (!info.isDirectory()) throw new Error("Choose a folder.")
  return resolved
}

// [projectId, chatId, file] to the attachment's path, or null when the parts
// could leave the library's attachment folders.
export function attachmentFile(libraryRoot: string, parts: string[]): string | null {
  if (parts.length !== 3) return null
  if (parts.some((part) => !part || part.includes("..") || part.includes("/") || part.includes("\\"))) return null
  const file = join(libraryRoot, "projects", parts[0]!, "chats", parts[1]!, "attachments", parts[2]!)
  if (!file.startsWith(join(libraryRoot, "projects"))) return null
  return file
}

async function deleteProjectFolder(folder: string): Promise<void> {
  let resolved = folder
  try {
    resolved = await realpath(folder)
  } catch {
    return
  }
  const home = homedir()
  if (resolved === home || resolved === "/" || resolved === "/Users" || resolved === "/private") {
    throw new Error("That folder can't be deleted from here.")
  }
  const info = await stat(resolved)
  if (!info.isDirectory()) throw new Error("Choose a folder.")
  await rm(resolved, { recursive: true })
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(file, "utf8")
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  const temp = `${file}.${randomUUID()}.tmp`
  await writeFile(temp, `${JSON.stringify(value)}\n`)
  await rename(temp, file)
}
