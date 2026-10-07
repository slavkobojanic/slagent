import { describe, expect, it } from "vitest"
import type { SlashCommand } from "@shared/types"
import { PaletteStore } from "@/features/library/command-palette/palette-store/palette-store"

const review: SlashCommand = { name: "review", insert: "/review", description: "Review the changes", kind: "prompt" }

describe("PaletteStore", () => {
  describe("setSlashCommands", () => {
    it("can start with no skills or slash commands listed", () => {
      expect(new PaletteStore().slashCommands).toEqual([])
    })

    it("can hold the list that was loaded", () => {
      const store = new PaletteStore()

      store.setSlashCommands([review])

      expect(store.slashCommands).toEqual([review])
    })
  })

  describe("setQuery", () => {
    it("can start with an empty query", () => {
      expect(new PaletteStore().query).toBe("")
    })

    it("can hold what the user typed", () => {
      const store = new PaletteStore()

      store.setQuery("gp")

      expect(store.query).toBe("gp")
    })
  })
})
