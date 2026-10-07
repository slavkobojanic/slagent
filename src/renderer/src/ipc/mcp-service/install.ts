import { getInstallContext } from "@/ipc/install-context"
import { FakeMcpService } from "./fake-mcp-service"
import { IpcMcpService, type McpService } from "./mcp-service"

export function installMcpService(): McpService {
  const ctx = getInstallContext()
  if (ctx.mode === "fake") {
    return new FakeMcpService()
  }

  return new IpcMcpService(ctx.api)
}
