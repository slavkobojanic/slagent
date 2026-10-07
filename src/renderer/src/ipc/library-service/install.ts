import { getInstallContext } from "@/ipc/install-context"
import { FakeLibraryService } from "./fake-library-service"
import { IpcLibraryService, type LibraryService } from "./library-service"

export function installLibraryService(): LibraryService {
  const ctx = getInstallContext()
  if (ctx.mode === "fake") {
    return new FakeLibraryService()
  }

  return new IpcLibraryService(ctx.api)
}
