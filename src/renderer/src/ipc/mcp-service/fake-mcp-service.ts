import type { McpServerStatus } from "@shared/types"
import type { McpService } from "./mcp-service"

// No servers are configured in the fake.
export class FakeMcpService implements McpService {
  mcpList = async (): Promise<McpServerStatus[]> => []
  mcpSignIn = async (): Promise<McpServerStatus[]> => []
  mcpSignOut = async (): Promise<McpServerStatus[]> => []
  mcpSetEnabled = async (): Promise<McpServerStatus[]> => []
}
