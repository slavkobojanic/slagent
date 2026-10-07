import { getInstallContext } from "@/ipc/install-context"
import { FakeCliService } from "./fake-cli-service"
import { IpcCliService, type CliService } from "./cli-service"

export function installCliService(): CliService {
  const ctx = getInstallContext()
  if (ctx.mode === "fake") {
    return new FakeCliService()
  }

  return new IpcCliService(ctx.api)
}
