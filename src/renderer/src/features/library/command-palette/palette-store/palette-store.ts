import { makeAutoObservable, observableRef } from "mobx"
import type { SlashCommand } from "@shared/types"

// The skills and slash commands the palette lists. They are fetched each time the palette opens.
export class PaletteStore {
  slashCommands: SlashCommand[] = []
  // What the user has typed in the palette. The models group shows only for a specific enough query.
  query = ""

  constructor() {
    makeAutoObservable(this, { slashCommands: observableRef })
  }

  setSlashCommands(value: SlashCommand[]) {
    this.slashCommands = value
  }

  setQuery(value: string) {
    this.query = value
  }
}
