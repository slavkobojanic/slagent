import { getInstallContext } from "@/ipc/install-context"
import { FakeUpdateService } from "./fake-update-service"
import { IpcUpdateService, type UpdateService } from "./update-service"

export function installUpdateService(): UpdateService {
  const ctx = getInstallContext()
  if (ctx.mode === "fake") {
    return new FakeUpdateService()
  }

  return new IpcUpdateService(ctx.api)
}
