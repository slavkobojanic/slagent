import type { UpdateService } from "./update-service"

export class FakeUpdateService implements UpdateService {
  private readonly listeners = new Set<(version: string) => void>()

  updateStatus = async (): Promise<string | null> => null
  installUpdate = async () => {}

  onUpdateReady = (listener: (version: string) => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  // Tests use this to simulate a downloaded update becoming ready to install.
  emitUpdateReady = (version: string) => {
    for (const listener of this.listeners) {
      listener(version)
    }
  }
}
