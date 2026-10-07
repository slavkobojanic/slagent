import type { ModelChange, Personalisation, SlagentApi } from "@shared/types"

export interface SettingsService {
  saveOpenRouterKey(apiKey: string): Promise<void>
  logoutOpenRouter(): Promise<void>
  setModel(modelId: string): Promise<ModelChange>
  setPersonalisation(value: Personalisation): Promise<void>
}

export class IpcSettingsService implements SettingsService {
  constructor(private readonly api: SlagentApi) {}

  saveOpenRouterKey = (apiKey: string) => this.api.saveOpenRouterKey(apiKey)
  logoutOpenRouter = () => this.api.logoutOpenRouter()
  setModel = (modelId: string) => this.api.setModel(modelId)
  setPersonalisation = (value: Personalisation) => this.api.setPersonalisation(value)
}
