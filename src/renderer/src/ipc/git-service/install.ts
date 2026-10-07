import { getInstallContext } from "@/ipc/install-context"
import { FakeGitService } from "./fake-git-service"
import { IpcGitService, type GitService } from "./git-service"

export function installGitService(): GitService {
  const ctx = getInstallContext()
  if (ctx.mode === "fake") {
    return new FakeGitService()
  }

  return new IpcGitService(ctx.api)
}
