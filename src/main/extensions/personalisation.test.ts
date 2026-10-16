import { describe, expect, it } from "vitest"
import { EMPTY_PERSONALISATION, type Personalisation } from "../../shared/types"
import { personalisationPrompt, systemPromptAppend, workModePrompt } from "./personalisation"

describe("work mode prompt", () => {
  it("is always present, even with no personalisation set", () => {
    expect(personalisationPrompt(EMPTY_PERSONALISATION)).toBeNull()
    const prompt = workModePrompt()
    expect(prompt).toContain("[WORK MODE]")
    expect(prompt).toContain("do everything")
    expect(prompt).toContain("don't stop at the next milestone")
  })

  it("joins personalisation and work mode in the run append", () => {
    const prefs: Personalisation = { ...EMPTY_PERSONALISATION, tone: "direct" }
    const append = systemPromptAppend(prefs)!
    expect(append).toContain("[USER PERSONALISATION]")
    expect(append).toContain("- Tone: direct")
    expect(append.indexOf("[USER PERSONALISATION]")).toBeLessThan(append.indexOf("[WORK MODE]"))
  })

  it("survives a null append when only work mode would be present", () => {
    // Work mode is unconditional, so the append is never null.
    expect(systemPromptAppend(EMPTY_PERSONALISATION)).toContain("[WORK MODE]")
  })
})
