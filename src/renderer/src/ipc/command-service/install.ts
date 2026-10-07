import { getInstallContext } from "@/ipc/install-context"
import { FakeCommandService } from "./fake-command-service"
import { IpcCommandService, type CommandService } from "./command-service"

export function installCommandService(): CommandService {
  const ctx = getInstallContext()
  if (ctx.mode === "fake") {
    return new FakeCommandService()
  }

  return new IpcCommandService(ctx.api)
}
