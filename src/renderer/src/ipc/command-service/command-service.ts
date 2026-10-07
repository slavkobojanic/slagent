import type { SlagentApi, SlashCommand } from "@shared/types"

export interface CommandService {
  listCommands(): Promise<SlashCommand[]>
}

export class IpcCommandService implements CommandService {
  constructor(private readonly api: SlagentApi) {}

  listCommands = () => this.api.listCommands()
}
