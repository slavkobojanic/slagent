import type { SlashCommand } from "@shared/types"
import type { CommandService } from "./command-service"

export class FakeCommandService implements CommandService {
  listCommands = async (): Promise<SlashCommand[]> => []
}
