import { describe, expect, it } from "vitest"
import { expandSkillAlias, skillCommandInsert } from "./skill-command"

describe("skill command aliases", () => {
  const skills = new Set(["animate", "wait-what"])

  it("uses the short command when there is no conflict", () => {
    expect(skillCommandInsert("animate", new Set())).toBe("/animate")
    expect(expandSkillAlias("/animate", skills, new Set())).toBe("/skill:animate")
  })

  it("keeps arguments and attached reference text after the alias", () => {
    expect(expandSkillAlias("/animate add a transition\n\nReferenced files:\n- Button.tsx", skills, new Set())).toBe(
      "/skill:animate add a transition\n\nReferenced files:\n- Button.tsx",
    )
  })

  it("keeps the explicit syntax when a template or extension command has the same name", () => {
    const reserved = new Set(["animate"])
    expect(skillCommandInsert("animate", reserved)).toBe("/skill:animate")
    expect(expandSkillAlias("/animate", skills, reserved)).toBe("/animate")
  })

  it("leaves unknown commands and explicit skill commands unchanged", () => {
    expect(expandSkillAlias("/gather-context-and-clarify", skills, new Set())).toBe("/gather-context-and-clarify")
    expect(expandSkillAlias("/skill:animate", skills, new Set())).toBe("/skill:animate")
    expect(expandSkillAlias("Please /animate", skills, new Set())).toBe("Please /animate")
  })
})
