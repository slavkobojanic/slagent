import { getInstallContext } from "@/ipc/install-context"
import { FakeFileService } from "./fake-file-service"
import { IpcFileService, type FileService } from "./file-service"

export function installFileService(): FileService {
  const ctx = getInstallContext()
  if (ctx.mode === "fake") {
    return new FakeFileService()
  }

  return new IpcFileService(ctx.api)
}
