import { describe, expect, it } from "vitest"
import type { SlashCommand } from "@shared/types"
import { chatMentionAt, filterCommands, hashAt, kindLabel, mentionAt, slashAt } from "@/features/composer/prompt-text"

function command(insert: string, description = ""): SlashCommand {
  return { name: insert.slice(1), insert, description, kind: "command" }
}

describe("mentionAt", () => {
  it("can find an @ that starts a word, with the query typed after it", () => {
    expect(mentionAt("look at @src/ap", 15)).toEqual({ query: "src/ap", start: 8 })
  })

  it("can find an @ at the start of the text", () => {
    expect(mentionAt("@a", 2)).toEqual({ query: "a", start: 0 })
  })

  it("can ignore an @ inside a word", () => {
    expect(mentionAt("mail@host", 9)).toBeNull()
  })

  it("can end the mention at a space", () => {
    expect(mentionAt("@a b", 4)).toBeNull()
  })
})

describe("chatMentionAt", () => {
  it("can find a $ that starts a word", () => {
    expect(chatMentionAt("see $fixb", 9)).toEqual({ query: "fixb", start: 4 })
  })

  it("can yield to an @ that comes after the $", () => {
    expect(chatMentionAt("$a@b", 4)).toBeNull()
  })
})

describe("slashAt", () => {
  it("can return the command typed so far at the start", () => {
    expect(slashAt("/com", 4)).toEqual({ query: "com", start: 0 })
  })

  it("can return an empty query for a lone slash", () => {
    expect(slashAt("/", 1)).toEqual({ query: "", start: 0 })
  })

  it("can open mid-sentence like @ and $", () => {
    expect(slashAt("hi /com", 7)).toEqual({ query: "com", start: 3 })
  })

  it("can ignore a slash inside a word", () => {
    expect(slashAt("see src/com", 11)).toBeNull()
  })

  it("can close once a space follows the command", () => {
    expect(slashAt("/com ", 5)).toBeNull()
  })
})

describe("hashAt", () => {
  it("can return the built-in typed so far at the start", () => {
    expect(hashAt("#cre", 4)).toEqual({ query: "cre", start: 0 })
  })

  it("can return an empty query for a lone hash", () => {
    expect(hashAt("#", 1)).toEqual({ query: "", start: 0 })
  })

  it("can open mid-sentence like /", () => {
    expect(hashAt("hi #cre", 7)).toEqual({ query: "cre", start: 3 })
  })

  it("can ignore a hash inside a word", () => {
    expect(hashAt("issue#123", 9)).toBeNull()
  })

  it("can close once a space follows the command", () => {
    expect(hashAt("#create-skill make it terse", 27)).toBeNull()
  })
})

describe("filterCommands", () => {
  it("can list commands that start with the query before those that only contain it", () => {
    const items = [command("/review-plan"), command("/plan"), command("/planner")]

    expect(filterCommands(items, "plan").map((item) => item.insert)).toEqual(["/plan", "/planner", "/review-plan"])
  })

  it("can match a command on its name when the inserted text differs", () => {
    const items = [{ name: "deploy", insert: "/ship", description: "", kind: "skill" as const }]

    expect(filterCommands(items, "dep")).toEqual(items)
  })

  it("can keep at most 50 matches", () => {
    const items = Array.from({ length: 60 }, (_, index) => command(`/a${index}`))

    expect(filterCommands(items, "a")).toHaveLength(50)
  })
})

describe("kindLabel", () => {
  it("can name a skill, a prompt template, a command, and a built-in", () => {
    expect([kindLabel("skill"), kindLabel("prompt"), kindLabel("command"), kindLabel("builtin")]).toEqual(["Skill", "Prompt template", "Command", "Built-in"])
  })
})
