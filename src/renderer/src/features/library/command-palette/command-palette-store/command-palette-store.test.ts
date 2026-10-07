import { describe, expect, it } from "vitest"
import type { SlashCommand } from "@shared/types"
import { CommandPaletteStore } from "@/features/library/command-palette/command-palette-store/command-palette-store"

const review: SlashCommand = { name: "review", insert: "/review", description: "Review the changes", kind: "prompt" }

describe("CommandPaletteStore", () => {
  describe("setSlashCommands", () => {
    it("can start with no skills or slash commands listed", () => {
      expect(new CommandPaletteStore().slashCommands).toEqual([])
    })

    it("can hold the list that was loaded", () => {
      const store = new CommandPaletteStore()

      store.setSlashCommands([review])

      expect(store.slashCommands).toEqual([review])
    })
  })

  describe("setQuery", () => {
    it("can start with an empty query", () => {
      expect(new CommandPaletteStore().query).toBe("")
    })

    it("can hold what the user typed", () => {
      const store = new CommandPaletteStore()

      store.setQuery("gp")

      expect(store.query).toBe("gp")
    })
  })
})
