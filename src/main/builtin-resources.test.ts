import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DefaultResourceLoader } from "@earendil-works/pi-coding-agent"
import { afterEach, describe, expect, it } from "vitest"
import { builtinPromptPath, builtinSkillPath } from "./builtin-resources"

const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

describe("built-in resources", () => {
  it("loads bundled skills and prompt templates from the app directory", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "slagent-builtins-"))
    tempDirs.push(cwd)
    const appPath = process.cwd()
    const loader = new DefaultResourceLoader({
      cwd,
      agentDir: join(cwd, "agent"),
      additionalSkillPaths: [builtinSkillPath(appPath)],
      additionalPromptTemplatePaths: [builtinPromptPath(appPath)],
      noExtensions: true,
      noThemes: true,
    })

    await loader.reload()

    expect(loader.getSkills().skills.map(({ name }) => name)).toEqual(
      expect.arrayContaining(["animate", "grill-me", "to-questionnaire", "to-tickets", "wait-what"]),
    )
    expect(loader.getPrompts().prompts.map(({ name }) => name)).toContain("gather-context-and-clarify")
  })
})
