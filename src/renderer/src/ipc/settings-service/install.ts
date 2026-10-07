import { getInstallContext } from "@/ipc/install-context"
import { FakeSettingsService } from "./fake-settings-service"
import { IpcSettingsService, type SettingsService } from "./settings-service"

export function installSettingsService(): SettingsService {
  const ctx = getInstallContext()
  if (ctx.mode === "fake") {
    return new FakeSettingsService()
  }

  return new IpcSettingsService(ctx.api)
}
