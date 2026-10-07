import { describe, expect, it } from "vitest"
import type { ChatMessage, OpenRouterStatus } from "@shared/types"
import { errorText, folderName, formatContext, formatTranscript, looksLikePath, modKey, openRouterLabel } from "@/lib/format"

const unconfigured: OpenRouterStatus = { configured: false, source: null, type: null, envKey: false }

describe("looksLikePath", () => {
  it("can accept a relative file path with a line number", () => {
    expect(looksLikePath("src/app.ts:12")).toBe(true)
  })

  it("can accept a file URL", () => {
    expect(looksLikePath("file:///work/src/app.ts")).toBe(true)
  })

  it("can reject a web address", () => {
    expect(looksLikePath("https://example.com/docs.html")).toBe(false)
  })

  it("can reject text with a space in it", () => {
    expect(looksLikePath("see src/app.ts")).toBe(false)
  })

  it("can reject a bare word with no extension", () => {
    expect(looksLikePath("hello")).toBe(false)
  })
})

describe("modKey", () => {
  it("can be the Command symbol on macOS", () => {
    expect(modKey("darwin")).toBe("⌘")
  })

  it("can be Ctrl+ on other platforms", () => {
    expect(modKey("win32")).toBe("Ctrl+")
  })
})

describe("errorText", () => {
  it("can return the message of an Error", () => {
    expect(errorText(new Error("disk full"))).toBe("disk full")
  })

  it("can fall back to a generic message for anything else", () => {
    expect(errorText("disk full")).toBe("Something went wrong.")
  })
})

describe("folderName", () => {
  it("can return the last folder of a path", () => {
    expect(folderName("/Users/you/projects/slagent")).toBe("slagent")
  })

  it("can return the input when it has no folder name", () => {
    expect(folderName("/")).toBe("/")
  })
})

describe("formatContext", () => {
  it("can show a context window in thousands", () => {
    expect(formatContext(128_000)).toBe("128k context")
  })

  it("can show a context window of a million or more in millions", () => {
    expect(formatContext(1_500_000)).toBe("1.5M context")
  })
})

describe("openRouterLabel", () => {
  it("can say Not connected when no key is configured", () => {
    expect(openRouterLabel(unconfigured)).toBe("Not connected")
  })

  it("can say Signed in for an OAuth connection", () => {
    expect(openRouterLabel({ configured: true, source: "OAuth", type: "oauth", envKey: false })).toBe("Signed in")
  })
})

describe("formatTranscript", () => {
  it("can return an empty string when there is nothing to copy", () => {
    expect(formatTranscript("Chat", [])).toBe("")
  })

  it("can label each turn and keep the chat title as the heading", () => {
    const messages: ChatMessage[] = [
      { id: "1", role: "user", text: "fix the bug", attachments: [] },
      { id: "2", role: "assistant", text: "done", thinking: "", streaming: false, error: null },
    ]

    expect(formatTranscript("Bug fix", messages)).toBe("# Bug fix\n\nYou\nfix the bug\n\nAssistant\ndone")
  })
})
