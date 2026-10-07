import { makeAutoObservable } from "mobx"
import type { SlashCommand } from "@shared/types"

export class CommandPaletteStore {
  slashCommands: SlashCommand[] = []
  query = ""

  constructor() {
    makeAutoObservable(this)
  }

  setSlashCommands(value: SlashCommand[]) {
    this.slashCommands = value
  }

  setQuery(value: string) {
    this.query = value
  }
}
