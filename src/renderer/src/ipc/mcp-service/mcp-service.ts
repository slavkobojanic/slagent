import type { McpServerStatus, SlagentApi } from "@shared/types"

export interface McpService {
  mcpList(): Promise<McpServerStatus[]>
  mcpSignIn(name: string): Promise<McpServerStatus[]>
  mcpSignOut(name: string): Promise<McpServerStatus[]>
  mcpSetEnabled(name: string, enabled: boolean): Promise<McpServerStatus[]>
}

export class IpcMcpService implements McpService {
  constructor(private readonly api: SlagentApi) {}

  mcpList = () => this.api.mcpList()
  mcpSignIn = (name: string) => this.api.mcpSignIn(name)
  mcpSignOut = (name: string) => this.api.mcpSignOut(name)
  mcpSetEnabled = (name: string, enabled: boolean) => this.api.mcpSetEnabled(name, enabled)
}
