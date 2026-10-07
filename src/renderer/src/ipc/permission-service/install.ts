import { getInstallContext } from "@/ipc/install-context"
import { FakePermissionService } from "./fake-permission-service"
import { IpcPermissionService, type PermissionService } from "./permission-service"

export function installPermissionService(): PermissionService {
  const ctx = getInstallContext()
  if (ctx.mode === "fake") {
    return new FakePermissionService()
  }

  return new IpcPermissionService(ctx.api)
}
