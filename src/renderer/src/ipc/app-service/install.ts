import { getInstallContext } from "@/ipc/install-context"
import { FakeAppService } from "./fake-app-service"
import { IpcAppService, type AppService } from "./app-service"

export function installAppService(): AppService {
  const ctx = getInstallContext()
  if (ctx.mode === "fake") {
    return new FakeAppService()
  }

  return new IpcAppService(ctx.api)
}
