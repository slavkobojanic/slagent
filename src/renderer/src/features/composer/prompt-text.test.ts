import { describe, expect, it } from "vitest"
import type { SlashCommand } from "@shared/types"
import { chatMentionAt, filterCommands, kindLabel, mentionAt, slashAt } from "@/features/composer/prompt-text"

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
  it("can return the command typed so far while the caret is in the first word", () => {
    expect(slashAt("/com", 4)).toBe("com")
  })

  it("can return an empty query for a lone slash", () => {
    expect(slashAt("/", 1)).toBe("")
  })

  it("can ignore a slash that is not at the start", () => {
    expect(slashAt("hi /com", 7)).toBeNull()
  })

  it("can close once a space follows the command", () => {
    expect(slashAt("/com ", 5)).toBeNull()
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
  it("can name a skill, a prompt template, and a command", () => {
    expect([kindLabel("skill"), kindLabel("prompt"), kindLabel("command")]).toEqual(["Skill", "Prompt template", "Command"])
  })
})
