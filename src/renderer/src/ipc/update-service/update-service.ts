import type { SlagentApi } from "@shared/types"

export interface UpdateService {
  // Version of a downloaded update waiting for a restart, or null.
  updateStatus(): Promise<string | null>
  installUpdate(): Promise<void>
  onUpdateReady(listener: (version: string) => void): () => void
}

export class IpcUpdateService implements UpdateService {
  constructor(private readonly api: SlagentApi) {}

  updateStatus = () => this.api.updateStatus()
  installUpdate = () => this.api.installUpdate()
  onUpdateReady = (listener: (version: string) => void) => this.api.onUpdateReady(listener)
}
