import type { SlagentApi, Snapshot, UiEvent } from "@shared/types"

export interface AppService {
  readonly platform: string
  readonly systemVersion: string
  getSnapshot(): Promise<Snapshot>
  onEvent(listener: (event: UiEvent) => void): () => void
  openExternal(url: string): Promise<void>
}

export class IpcAppService implements AppService {
  readonly platform: string
  readonly systemVersion: string

  // Both values are fixed for the life of the process, so they are read once.
  constructor(private readonly api: SlagentApi) {
    this.platform = api.platform
    this.systemVersion = api.systemVersion
  }

  getSnapshot = () => this.api.getSnapshot()
  onEvent = (listener: (event: UiEvent) => void) => this.api.onEvent(listener)
  openExternal = (url: string) => this.api.openExternal(url)
}
