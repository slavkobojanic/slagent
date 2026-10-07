import type { AppService } from "@/ipc/app-service/app-service"
import { installAppService } from "@/ipc/app-service/install"
import type { ChatService } from "@/ipc/chat-service/chat-service"
import { installChatService } from "@/ipc/chat-service/install"
import type { LibraryService } from "@/ipc/library-service/library-service"
import { installLibraryService } from "@/ipc/library-service/install"
import type { FileService } from "@/ipc/file-service/file-service"
import { installFileService } from "@/ipc/file-service/install"
import type { CommandService } from "@/ipc/command-service/command-service"
import { installCommandService } from "@/ipc/command-service/install"
import type { TaskService } from "@/ipc/task-service/task-service"
import { installTaskService } from "@/ipc/task-service/install"
import type { GitService } from "@/ipc/git-service/git-service"
import { installGitService } from "@/ipc/git-service/install"
import type { SettingsService } from "@/ipc/settings-service/settings-service"
import { installSettingsService } from "@/ipc/settings-service/install"
import type { CliService } from "@/ipc/cli-service/cli-service"
import { installCliService } from "@/ipc/cli-service/install"
import type { McpService } from "@/ipc/mcp-service/mcp-service"
import { installMcpService } from "@/ipc/mcp-service/install"
import type { PermissionService } from "@/ipc/permission-service/permission-service"
import { installPermissionService } from "@/ipc/permission-service/install"
import type { UpdateService } from "@/ipc/update-service/update-service"
import { installUpdateService } from "@/ipc/update-service/install"

export type Services = {
  app: AppService
  chat: ChatService
  library: LibraryService
  files: FileService
  commands: CommandService
  tasks: TaskService
  git: GitService
  settings: SettingsService
  cli: CliService
  mcp: McpService
  permissions: PermissionService
  updates: UpdateService
}

export function installServices(): Services {
  return {
    app: installAppService(),
    chat: installChatService(),
    library: installLibraryService(),
    files: installFileService(),
    commands: installCommandService(),
    tasks: installTaskService(),
    git: installGitService(),
    settings: installSettingsService(),
    cli: installCliService(),
    mcp: installMcpService(),
    permissions: installPermissionService(),
    updates: installUpdateService(),
  }
}
