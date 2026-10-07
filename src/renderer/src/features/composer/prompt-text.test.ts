import { describe, expect, it } from "vitest"
import type { SlashCommand } from "@shared/types"
import { base64FromDataUrl, chatMentionAt, filterCommands, kindLabel, mentionAt, pendingLabel, slashAt } from "@/features/composer/prompt-text"

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

describe("base64FromDataUrl", () => {
  it("can return the bytes after the base64 marker", () => {
    expect(base64FromDataUrl("data:text/plain;base64,aGk=")).toBe("aGk=")
  })

  it("can return null when the URL has no base64 part", () => {
    expect(base64FromDataUrl("blob:abc")).toBeNull()
  })

  it("can return null when there is no URL", () => {
    expect(base64FromDataUrl(undefined)).toBeNull()
  })
})

describe("pendingLabel", () => {
  it("can be empty when nothing is pending", () => {
    expect(pendingLabel(0, 0)).toBe("")
  })

  it("can name a single diff comment", () => {
    expect(pendingLabel(1, 0)).toBe("1 diff comment")
  })

  it("can count reply comments in the plural", () => {
    expect(pendingLabel(0, 2)).toBe("2 reply comments")
  })

  it("can join replies and diff comments with and, replies first", () => {
    expect(pendingLabel(3, 1)).toBe("1 reply comment and 3 diff comments")
  })
})
