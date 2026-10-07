import type { ModelChange } from "@shared/types"
import type { SettingsService } from "./settings-service"

export class FakeSettingsService implements SettingsService {
  saveOpenRouterKey = async () => {}
  logoutOpenRouter = async () => {}
  setModel = async (): Promise<ModelChange> => ({ applied: true })
  setPersonalisation = async () => {}
}
