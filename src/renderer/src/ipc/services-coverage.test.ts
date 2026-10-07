import { describe, expect, it, vi } from "vitest"
import type { SlagentApi } from "@shared/types"
import { IpcAppService, type AppService } from "@/ipc/app-service/app-service"
import { IpcChatService, type ChatService } from "@/ipc/chat-service/chat-service"
import { IpcLibraryService, type LibraryService } from "@/ipc/library-service/library-service"
import { IpcFileService, type FileService } from "@/ipc/file-service/file-service"
import { IpcCommandService, type CommandService } from "@/ipc/command-service/command-service"
import { IpcTaskService, type TaskService } from "@/ipc/task-service/task-service"
import { IpcGitService, type GitService } from "@/ipc/git-service/git-service"
import { IpcSettingsService, type SettingsService } from "@/ipc/settings-service/settings-service"
import { IpcCliService, type CliService } from "@/ipc/cli-service/cli-service"
import { IpcMcpService, type McpService } from "@/ipc/mcp-service/mcp-service"
import { IpcPermissionService, type PermissionService } from "@/ipc/permission-service/permission-service"
import { IpcUpdateService, type UpdateService } from "@/ipc/update-service/update-service"
import type { Services } from "@/ipc/services"

// Every SlagentApi key, written out. `satisfies` turns a key that SlagentApi adds,
// drops or renames into a compile error here, so this list cannot drift silently.
const SLAGENT_API_KEYS = {
  platform: true,
  systemVersion: true,
  getSnapshot: true,
  prompt: true,
  abort: true,
  newChat: true,
  openProject: true,
  openChat: true,
  pageTranscript: true,
  searchChats: true,
  pinProject: true,
  pinChat: true,
  renameChat: true,
  deleteChat: true,
  readTranscript: true,
  removeProject: true,
  searchFiles: true,
  listCommands: true,
  pathForFile: true,
  chooseFolder: true,
  setModel: true,
  saveOpenRouterKey: true,
  logoutOpenRouter: true,
  openExternal: true,
  openInEditor: true,
  readFile: true,
  setQueueMode: true,
  removeQueued: true,
  editMessage: true,
  setPlanMode: true,
  approvePlan: true,
  answerQuestion: true,
  rewind: true,
  undoRewind: true,
  taskOutput: true,
  stopTask: true,
  gitStatus: true,
  gitDiff: true,
  gitCommit: true,
  gitPush: true,
  gitPullRequest: true,
  gitCommitMessage: true,
  compact: true,
  getPermissions: true,
  requestAccessibility: true,
  requestScreenRecording: true,
  openPermissionSettings: true,
  mcpList: true,
  mcpSignIn: true,
  mcpSignOut: true,
  mcpSetEnabled: true,
  onEvent: true,
  updateStatus: true,
  installUpdate: true,
  onUpdateReady: true,
  cliStatus: true,
  installCli: true,
  uninstallCli: true,
  setPersonalisation: true,
} satisfies Record<keyof SlagentApi, true>

// The keys each domain interface covers. `satisfies Record<keyof Interface, true>`
// fails to compile when an interface gains or loses a method without this list changing.
const DOMAIN_KEYS = {
  app: {
    platform: true,
    systemVersion: true,
    getSnapshot: true,
    onEvent: true,
    openExternal: true,
  } satisfies Record<keyof AppService, true>,
  chat: {
    prompt: true,
    abort: true,
    newChat: true,
    editMessage: true,
    rewind: true,
    undoRewind: true,
    compact: true,
    setQueueMode: true,
    removeQueued: true,
    setPlanMode: true,
    approvePlan: true,
    answerQuestion: true,
    pageTranscript: true,
    readTranscript: true,
  } satisfies Record<keyof ChatService, true>,
  library: {
    openProject: true,
    openChat: true,
    searchChats: true,
    pinProject: true,
    pinChat: true,
    renameChat: true,
    deleteChat: true,
    removeProject: true,
    chooseFolder: true,
  } satisfies Record<keyof LibraryService, true>,
  files: {
    searchFiles: true,
    readFile: true,
    openInEditor: true,
    pathForFile: true,
  } satisfies Record<keyof FileService, true>,
  commands: {
    listCommands: true,
  } satisfies Record<keyof CommandService, true>,
  tasks: {
    taskOutput: true,
    stopTask: true,
  } satisfies Record<keyof TaskService, true>,
  git: {
    gitStatus: true,
    gitDiff: true,
    gitCommit: true,
    gitPush: true,
    gitPullRequest: true,
    gitCommitMessage: true,
  } satisfies Record<keyof GitService, true>,
  settings: {
    saveOpenRouterKey: true,
    logoutOpenRouter: true,
    setModel: true,
    setPersonalisation: true,
  } satisfies Record<keyof SettingsService, true>,
  cli: {
    cliStatus: true,
    installCli: true,
    uninstallCli: true,
  } satisfies Record<keyof CliService, true>,
  mcp: {
    mcpList: true,
    mcpSignIn: true,
    mcpSignOut: true,
    mcpSetEnabled: true,
  } satisfies Record<keyof McpService, true>,
  permissions: {
    getPermissions: true,
    requestAccessibility: true,
    requestScreenRecording: true,
    openPermissionSettings: true,
  } satisfies Record<keyof PermissionService, true>,
  updates: {
    updateStatus: true,
    installUpdate: true,
    onUpdateReady: true,
  } satisfies Record<keyof UpdateService, true>,
}

// A SlagentApi whose functions are all spies. The return type makes a missing key a
// compile error, so the services below are built over a complete api.
function createFakeApi(): SlagentApi {
  return {
    platform: "darwin",
    systemVersion: "24.0.0",
    getSnapshot: vi.fn(),
    prompt: vi.fn(),
    abort: vi.fn(),
    newChat: vi.fn(),
    openProject: vi.fn(),
    openChat: vi.fn(),
    pageTranscript: vi.fn(),
    searchChats: vi.fn(),
    pinProject: vi.fn(),
    pinChat: vi.fn(),
    renameChat: vi.fn(),
    deleteChat: vi.fn(),
    readTranscript: vi.fn(),
    removeProject: vi.fn(),
    searchFiles: vi.fn(),
    listCommands: vi.fn(),
    pathForFile: vi.fn(),
    chooseFolder: vi.fn(),
    setModel: vi.fn(),
    saveOpenRouterKey: vi.fn(),
    logoutOpenRouter: vi.fn(),
    openExternal: vi.fn(),
    openInEditor: vi.fn(),
    readFile: vi.fn(),
    setQueueMode: vi.fn(),
    removeQueued: vi.fn(),
    editMessage: vi.fn(),
    setPlanMode: vi.fn(),
    approvePlan: vi.fn(),
    answerQuestion: vi.fn(),
    rewind: vi.fn(),
    undoRewind: vi.fn(),
    taskOutput: vi.fn(),
    stopTask: vi.fn(),
    gitStatus: vi.fn(),
    gitDiff: vi.fn(),
    gitCommit: vi.fn(),
    gitPush: vi.fn(),
    gitPullRequest: vi.fn(),
    gitCommitMessage: vi.fn(),
    compact: vi.fn(),
    getPermissions: vi.fn(),
    requestAccessibility: vi.fn(),
    requestScreenRecording: vi.fn(),
    openPermissionSettings: vi.fn(),
    mcpList: vi.fn(),
    mcpSignIn: vi.fn(),
    mcpSignOut: vi.fn(),
    mcpSetEnabled: vi.fn(),
    onEvent: vi.fn(),
    updateStatus: vi.fn(),
    installUpdate: vi.fn(),
    onUpdateReady: vi.fn(),
    cliStatus: vi.fn(),
    installCli: vi.fn(),
    uninstallCli: vi.fn(),
    setPersonalisation: vi.fn(),
  }
}

// Fails for each key the service does not expose as a member.
function expectMembers(service: object, keys: Record<string, true>) {
  for (const key of Object.keys(keys)) {
    expect(service, key).toHaveProperty(key)
  }
}

describe("ipc services", () => {
  it("can cover every SlagentApi key exactly once when the domains are combined", () => {
    const covered = Object.values(DOMAIN_KEYS).flatMap((keys) => Object.keys(keys))

    expect(new Set(covered).size, "a method is covered by two domains").toBe(covered.length)
    expect(covered.sort(), "a SlagentApi key is missing or extra").toEqual(
      Object.keys(SLAGENT_API_KEYS).sort(),
    )
  })

  it("can expose each covered member when every domain is built over the fake api", () => {
    const api = createFakeApi()
    const services: Services = {
      app: new IpcAppService(api),
      chat: new IpcChatService(api),
      library: new IpcLibraryService(api),
      files: new IpcFileService(api),
      commands: new IpcCommandService(api),
      tasks: new IpcTaskService(api),
      git: new IpcGitService(api),
      settings: new IpcSettingsService(api),
      cli: new IpcCliService(api),
      mcp: new IpcMcpService(api),
      permissions: new IpcPermissionService(api),
      updates: new IpcUpdateService(api),
    }

    expectMembers(services.app, DOMAIN_KEYS.app)
    expectMembers(services.chat, DOMAIN_KEYS.chat)
    expectMembers(services.library, DOMAIN_KEYS.library)
    expectMembers(services.files, DOMAIN_KEYS.files)
    expectMembers(services.commands, DOMAIN_KEYS.commands)
    expectMembers(services.tasks, DOMAIN_KEYS.tasks)
    expectMembers(services.git, DOMAIN_KEYS.git)
    expectMembers(services.settings, DOMAIN_KEYS.settings)
    expectMembers(services.cli, DOMAIN_KEYS.cli)
    expectMembers(services.mcp, DOMAIN_KEYS.mcp)
    expectMembers(services.permissions, DOMAIN_KEYS.permissions)
    expectMembers(services.updates, DOMAIN_KEYS.updates)
  })
})
