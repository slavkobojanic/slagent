import { getInstallContext } from "@/ipc/install-context"
import { FakeTaskService } from "./fake-task-service"
import { IpcTaskService, type TaskService } from "./task-service"

export function installTaskService(): TaskService {
  const ctx = getInstallContext()
  if (ctx.mode === "fake") {
    return new FakeTaskService()
  }

  return new IpcTaskService(ctx.api)
}
