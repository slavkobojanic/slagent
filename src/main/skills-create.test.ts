import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { createSkillFile, parseDraft, sanitizeSkillName } from "./skills-create"

const userDir = { original: "" }

beforeAll(() => {
  userDir.original = process.env.PI_CODING_AGENT_DIR ?? ""
})

afterEach(async () => {
  process.env.PI_CODING_AGENT_DIR = userDir.original
})

afterAll(() => {
  process.env.PI_CODING_AGENT_DIR = userDir.original
})

describe("sanitizeSkillName", () => {
  it("can turn a title into a kebab-case slug", () => {
    expect(sanitizeSkillName("Release slagent Version!")).toBe("release-slagent-version")
  })

  it("can keep an already clean slug", () => {
    expect(sanitizeSkillName("release-slagent-version")).toBe("release-slagent-version")
  })

  it("can drop dots, slashes and other unsafe characters", () => {
    expect(sanitizeSkillName("../../etc/passwd")).toBe("etc-passwd")
  })

  it("can cap the length at 64 characters", () => {
    expect(sanitizeSkillName("a".repeat(80))).toHaveLength(64)
  })
})

describe("parseDraft", () => {
  it("can split a skill file into name, description and body", () => {
    const draft = parseDraft("---\nname: release-slagent-version\ndescription: Cuts a GitHub release.\n---\n\nDo the release.")

    expect(draft).toEqual({ name: "release-slagent-version", description: "Cuts a GitHub release.", body: "Do the release." })
  })

  it("can strip a code fence around the file", () => {
    const draft = parseDraft("```markdown\n---\nname: ship-it\ndescription: Ships it.\n---\n\nShip.\n```")

    expect(draft).toEqual({ name: "ship-it", description: "Ships it.", body: "Ship." })
  })

  it("can reject a reply without a frontmatter block", () => {
    expect(() => parseDraft("just some text")).toThrow()
  })

  it("can reject a draft with a missing field", () => {
    expect(() => parseDraft("---\nname: ship-it\n---\n\nBody.")).toThrow()
  })

  it("can sanitize a messy name from the model", () => {
    const draft = parseDraft("---\nname: Ship It!\ndescription: Ships it.\n---\n\nShip.")

    expect(draft.name).toBe("ship-it")
  })
})

describe("createSkillFile", () => {
  const input = { name: "release-slagent-version", description: "Cuts a GitHub release.", body: "Do the release.", location: "project" as const }

  it("can write the skill into the project's .agents/skills directory", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "slagent-skill-"))
    try {
      const file = await createSkillFile(cwd, input)

      expect(file).toBe(join(cwd, ".agents", "skills", "release-slagent-version", "SKILL.md"))
      const content = await readFile(file, "utf8")
      expect(content).toBe('---\nname: release-slagent-version\ndescription: "Cuts a GitHub release."\n---\n\nDo the release.\n')
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })

  it("can write the skill into the agent dir for the user location", async () => {
    const agentDir = await mkdtemp(join(tmpdir(), "slagent-agent-"))
    process.env.PI_CODING_AGENT_DIR = agentDir
    try {
      const file = await createSkillFile("/work", { ...input, location: "user" })

      expect(file).toBe(join(agentDir, "skills", "release-slagent-version", "SKILL.md"))
      expect(await readFile(file, "utf8")).toContain("name: release-slagent-version")
    } finally {
      await rm(agentDir, { recursive: true, force: true })
    }
  })

  it("can reject an empty name", async () => {
    await expect(createSkillFile("/work", { ...input, name: "..." })).rejects.toThrow("lowercase")
  })

  it("can reject an empty description", async () => {
    await expect(createSkillFile("/work", { ...input, description: "  \n " })).rejects.toThrow("description")
  })

  it("can reject a body with no instructions", async () => {
    await expect(createSkillFile("/work", { ...input, body: "   " })).rejects.toThrow("instructions")
  })
})