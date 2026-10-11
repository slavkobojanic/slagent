import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { listProjectDirectory } from "./list-directory"

describe("listProjectDirectory", () => {
  let root: string
  let outside: string

  beforeEach(async () => {
    root = await realpath(await mkdtemp(join(tmpdir(), "slagent-list-")))
    outside = await realpath(await mkdtemp(join(tmpdir(), "slagent-list-out-")))
    await mkdir(join(root, "src"))
    await mkdir(join(root, ".git"))
    await mkdir(join(root, "Zed"))
    await writeFile(join(root, "b.txt"), "")
    await writeFile(join(root, "A.txt"), "")
    await writeFile(join(root, "src", "index.ts"), "")
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
    await rm(outside, { recursive: true, force: true })
  })

  it("can list folders first, then files, each sorted without regard to case", async () => {
    const entries = await listProjectDirectory(root, "")

    expect(entries?.map((entry) => entry.name)).toEqual(["src", "Zed", "A.txt", "b.txt"])
    expect(entries?.map((entry) => entry.dir)).toEqual([true, true, false, false])
  })

  it("can hide the .git folder", async () => {
    expect((await listProjectDirectory(root, ""))?.some((entry) => entry.name === ".git")).toBe(false)
  })

  it("can list a subfolder", async () => {
    expect(await listProjectDirectory(root, "src")).toEqual([{ name: "index.ts", dir: false }])
  })

  it("can refuse a path that climbs out of the project", async () => {
    expect(await listProjectDirectory(root, "..")).toBeNull()
  })

  it("can refuse an absolute path", async () => {
    expect(await listProjectDirectory(root, outside)).toBeNull()
  })

  it("can refuse a symlinked folder that leads outside the project", async () => {
    await symlink(outside, join(root, "escape"))

    expect(await listProjectDirectory(root, "escape")).toBeNull()
  })

  it("can show a symlink to a folder inside as a folder", async () => {
    await symlink(join(root, "src"), join(root, "link"))

    expect((await listProjectDirectory(root, ""))?.find((entry) => entry.name === "link")?.dir).toBe(true)
  })

  it("can return null for a missing folder or a file", async () => {
    expect(await listProjectDirectory(root, "nope")).toBeNull()
    expect(await listProjectDirectory(root, "A.txt")).toBeNull()
  })

  it("can return null when no project is open", async () => {
    expect(await listProjectDirectory("", "")).toBeNull()
  })
})
