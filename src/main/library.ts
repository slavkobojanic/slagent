import { randomUUID } from "node:crypto"
import { mkdir, readFile, realpath, rename, rm, stat, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { basename, dirname, join } from "node:path"
import type { ChatMessage } from "../shared/types"

export type StoredProject = {
  id: string
  path: string
  name: string
  pinned: boolean
  pinnedAt: number
  lastOpenedAt: number
  openChatId: string | null
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
    const project = this.project(projectId)
    if (project?.openChatId === chatId) {
      project.openChatId = null
      await this.writeIndex()
    }
  }

  async removeProject(id: string): Promise<void> {
    const project = this.project(id)
    if (!project) return
    await deleteProjectFolder(project.path)
    this.index.projects = this.index.projects.filter((item) => item.id !== id)
    this.chats.delete(id)
    if (this.index.openProjectId === id) this.index.openProjectId = null
    await this.writeIndex()
    await rm(this.projectDir(id), { recursive: true, force: true })
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

  private projectFile(projectId: string): string {
    return join(this.projectDir(projectId), "project.json")
  }

  private chatDir(projectId: string, chatId: string): string {
    return join(this.projectDir(projectId), "chats", chatId)
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
  const temp = `${file}.${process.pid}.tmp`
  await writeFile(temp, `${JSON.stringify(value)}\n`)
  await rename(temp, file)
}
