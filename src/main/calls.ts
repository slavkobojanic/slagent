import { dialog, shell } from "electron"
import type {
  CreateSkillInput,
  DraftSkillInput,
  EffortLevel,
  ModelRouting,
  Personalisation,
  ProjectAppearance,
} from "../shared/types"
import type { AgentHost } from "./host"
import { cliStatus, installCli, uninstallCli } from "./cli"
import type { ComputerUse } from "./computer"
import { openInEditor, readFileView } from "./editor"
import type { McpManager } from "./mcp"
import { parsePrompt } from "./prompt"
import { parseReply } from "./extensions/ask-user"
import type { TerminalManager } from "./terminal"
import { appVersion, checkForUpdates, installUpdate, updateStatus } from "./updater"

// The permission panes macOS opens.
const permissionSettings = {
  accessibility: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
  screen: "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture",
} as const

export type CallDeps = {
  // All state lives behind these getters, so the same handler serves the app
  // and the headless daemon, which construct their own host and services.
  host: () => AgentHost
  computer: () => ComputerUse | null
  mcp: () => McpManager | null
  terminal: () => TerminalManager | null
  // File pickers, permission panes and closing windows exist only in the
  // desktop app; the daemon answers the rest from anywhere.
  desktop: boolean
  openExternal: (url: string) => Promise<void>
  closeWindow: (clientId: string) => void
}

export type CallHandler = {
  onCall: (clientId: string, method: string, params: unknown[]) => Promise<unknown>
  onCallSent: (clientId: string, method: string, params: unknown[]) => void
}

// Every websocket call from a client lands here, with the caller's identity
// first so the host can scope the call to that client's session.
export function createCallHandler(deps: CallDeps): CallHandler {
  const str = (value: unknown): string => {
    if (typeof value !== "string") throw new Error("Bad argument.")
    return value
  }
  const optStr = (value: unknown): string | undefined =>
    typeof value === "string" && value ? value : undefined
  const requireName = (name: unknown): string => {
    if (typeof name !== "string" || !name) throw new Error("Unknown MCP server.")
    return name
  }

  const onCall = async (clientId: string, method: string, params: unknown[]): Promise<unknown> => {
    const host = deps.host()
    const needDesktop = (): void => {
      if (!deps.desktop) throw new Error("Open the slagent app for this.")
    }
    switch (method) {
      case "getSnapshot":
        return host.getSnapshot(clientId)
      case "prompt":
        return host.prompt(clientId, parsePrompt(params[0]))
      case "abort":
        return host.abort(clientId)
      case "newChat":
        return host.newChat(clientId, optStr(params[0]))
      case "openProject":
        return host.openProject(clientId, str(params[0]))
      case "openChat":
        return host.openChat(clientId, str(params[0]), optStr(params[1]), optStr(params[2]))
      case "pageTranscript": {
        const page = params[0]
        if (page !== "older" && page !== "newer" && page !== "latest") throw new Error("Unknown page.")
        return host.pageTranscript(clientId, page)
      }
      case "searchChats":
        return host.searchChats(String(params[0] ?? ""))
      case "pinProject":
        return host.pinProject(clientId, str(params[0]), params[1] === true)
      case "setProjectAppearance":
        return host.setProjectAppearance(clientId, str(params[0]), params[1] as ProjectAppearance)
      case "pinChat":
        return host.pinChat(clientId, str(params[0]), params[1] === true, optStr(params[2]))
      case "renameChat":
        return host.renameChat(clientId, str(params[0]), str(params[1]), optStr(params[2]))
      case "deleteChat":
        return host.deleteChat(clientId, str(params[0]), optStr(params[1]))
      case "readTranscript":
        return host.readTranscript(clientId, str(params[0]), optStr(params[1]))
      case "removeProject":
        return host.removeProject(clientId, str(params[0]), str(params[1]))
      case "searchFiles":
        return host.searchFiles(clientId, String(params[0] ?? ""))
      case "listCommands":
        return host.listCommands(clientId)
      case "draftSkill":
        return host.draftSkill(clientId, params[0] as DraftSkillInput)
      case "createSkill":
        return host.createSkill(clientId, params[0] as CreateSkillInput)
      case "createChatProject":
        return host.createChatProject(clientId)
      case "chooseFolder": {
        needDesktop()
        const result = await dialog.showOpenDialog({
          title: "Choose a folder",
          defaultPath: host.getCwd() || undefined,
          properties: ["openDirectory", "createDirectory"],
        })
        const folder = result.filePaths[0]
        if (result.canceled || !folder) return
        await host.openFolder(clientId, folder)
        return
      }
      case "setModel":
        return host.setModel(clientId, str(params[0]))
      case "setTitleModel":
        return host.setTitleModel(String(params[0] ?? ""))
      case "setRouting":
        return host.setRouting(params[0] as ModelRouting)
      case "setEffort":
        return host.setEffort(params[0] as EffortLevel)
      case "saveOpenRouterKey":
        return host.saveOpenRouterKey(str(params[0]))
      case "logoutOpenRouter":
        return host.logoutOpenRouter()
      case "setQueueMode": {
        const mode = params[1]
        if (mode !== "follow-up" && mode !== "steer") throw new Error("Unknown queue mode.")
        return host.setQueueMode(clientId, str(params[0]), mode)
      }
      case "editMessage": {
        const text = params[1]
        if (typeof text !== "string" || !text.trim()) throw new Error("Write a message first.")
        return host.editMessage(clientId, str(params[0]), text)
      }
      case "setPlanMode":
        return host.setPlanMode(clientId, params[0] === true)
      case "approvePlan":
        return host.approvePlan(clientId)
      case "answerQuestion":
        return host.answerQuestion(clientId, str(params[0]), parseReply(params[1]))
      case "rewind": {
        const mode = params[1]
        if (mode !== "both" && mode !== "chat" && mode !== "code") throw new Error("Unknown rewind.")
        return host.rewind(clientId, str(params[0]), mode)
      }
      case "undoRewind": {
        const commit = params[0]
        if (typeof commit !== "string" || !/^[0-9a-f]{7,64}$/.test(commit)) throw new Error("Unknown checkpoint.")
        return host.undoRewind(clientId, commit)
      }
      case "taskOutput":
        return host.taskOutput(clientId, str(params[0]))
      case "stopTask":
        return host.stopTask(clientId, str(params[0]))
      case "gitStatus":
        return host.gitStatus(clientId)
      case "gitDiff":
        return host.gitDiff(clientId, params[0] === "turn" ? "turn" : "uncommitted")
      case "gitCommit":
        return host.gitCommit(clientId, String(params[0] ?? ""))
      case "gitPush":
        return host.gitPush(clientId)
      case "gitPullRequest":
        return host.gitPullRequest(clientId)
      case "gitCommitMessage":
        return host.gitCommitMessage(clientId)
      case "removeQueued":
        host.removeQueued(clientId, str(params[0]))
        return
      case "compact":
        return host.compact(clientId)
      case "openExternal": {
        const parsed = new URL(str(params[0]))
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
          throw new Error("Only web links can be opened.")
        }
        return deps.openExternal(parsed.toString())
      }
      case "openInEditor":
        return openInEditor(host.getCwd(), str(params[0]))
      case "readFile":
        return readFileView(host.getCwd(), str(params[0]))
      case "getPermissions":
        return deps.computer()?.permissions()
      case "requestAccessibility":
        return deps.computer()?.requestAccessibility()
      case "requestScreenRecording":
        return deps.computer()?.requestScreenRecording()
      case "openPermissionSettings": {
        needDesktop()
        const pane = str(params[0])
        if (pane !== "accessibility" && pane !== "screen") throw new Error("Unknown permission.")
        return deps.openExternal(permissionSettings[pane])
      }
      case "mcpList":
        return deps.mcp()?.list()
      case "mcpSignIn":
        return deps.mcp()?.signIn(requireName(params[0]))
      case "mcpSignOut":
        return deps.mcp()?.signOut(requireName(params[0]))
      case "mcpSetEnabled":
        return deps.mcp()?.setEnabled(requireName(params[0]), params[1] === true)
      case "usageStats":
        return host.usageStats()
      case "terminalCreate":
        return deps.terminal()?.create()
      case "updateStatus":
        return updateStatus()
      case "updateCheck":
        return checkForUpdates()
      case "installUpdate":
        return installUpdate()
      case "appVersion":
        return appVersion
      case "closeApp":
        deps.closeWindow(clientId)
        return
      case "cliStatus":
        return cliStatus()
      case "installCli":
        return installCli()
      case "uninstallCli":
        return uninstallCli()
      case "setPersonalisation":
        return host.setPersonalisation(params[0] as Personalisation)
      case "pickContextFiles": {
        needDesktop()
        return host.pickContextFiles()
      }
      default:
        throw new Error(`Unknown method: ${method}`)
    }
  }

  // Fire-and-forget calls: terminal keystrokes and drags.
  const onCallSent = (_clientId: string, method: string, params: unknown[]): void => {
    const terminal = deps.terminal()
    switch (method) {
      case "writeTerminal":
        if (typeof params[0] === "string" && typeof params[1] === "string") terminal?.write(params[0], params[1])
        return
      case "resizeTerminal":
        if (typeof params[0] === "string" && typeof params[1] === "number" && typeof params[2] === "number") {
          terminal?.resize(params[0], params[1], params[2])
        }
        return
      case "closeTerminal":
        if (typeof params[0] === "string") terminal?.close(params[0])
        return
      default:
        return
    }
  }

  return { onCall, onCallSent }
}

// Lets the calls open web links and macOS panes without knowing the platform.
export const systemOpenExternal = (url: string): Promise<void> => shell.openExternal(url)
