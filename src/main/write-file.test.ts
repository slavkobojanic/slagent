import { mkdtemp, readFile, rm, stat, utimes, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { writeProjectFile } from "./write-file"

describe("writeProjectFile", () => {
  let root: string
  let outside: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "slagent-write-"))
    outside = await mkdtemp(join(tmpdir(), "slagent-outside-"))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
    await rm(outside, { recursive: true, force: true })
  })

  it("can save a file when the mtime matches", async () => {
    const file = join(root, "a.txt")
    await writeFile(file, "old")
    const { mtimeMs } = await stat(file)

    const result = await writeProjectFile(root, file, "new", mtimeMs)

    expect(result.ok).toBe(true)
    expect(await readFile(file, "utf8")).toBe("new")
  })

  it("can report the new mtime and size after saving", async () => {
    const file = join(root, "a.txt")
    await writeFile(file, "old")
    const { mtimeMs } = await stat(file)

    const result = await writeProjectFile(root, file, "newer", mtimeMs)

    expect(result).toEqual({ ok: true, mtime: (await stat(file)).mtimeMs, size: 5 })
  })

  it("can refuse with a conflict when the file changed on disk", async () => {
    const file = join(root, "a.txt")
    await writeFile(file, "old")
    const { mtimeMs } = await stat(file)
    await utimes(file, new Date(), new Date(mtimeMs + 5000))

    const result = await writeProjectFile(root, file, "mine", mtimeMs)

    expect(result).toMatchObject({ ok: false, reason: "conflict" })
    expect(await readFile(file, "utf8")).toBe("old")
  })

  it("can refuse a file outside the project", async () => {
    const file = join(outside, "a.txt")
    await writeFile(file, "old")
    const { mtimeMs } = await stat(file)

    const result = await writeProjectFile(root, file, "mine", mtimeMs)

    expect(result).toMatchObject({ ok: false, reason: "outside-project" })
    expect(await readFile(file, "utf8")).toBe("old")
  })

  it("can refuse a sibling directory that only shares the project prefix", async () => {
    const result = await writeProjectFile(root, `${root}-sibling/a.txt`, "mine", 0)

    expect(result).toMatchObject({ ok: false, reason: "outside-project" })
  })

  it("can refuse when no project is open", async () => {
    const result = await writeProjectFile("", join(root, "a.txt"), "mine", 0)

    expect(result).toMatchObject({ ok: false, reason: "outside-project" })
  })

  it("can refuse a missing file", async () => {
    const result = await writeProjectFile(root, join(root, "missing.txt"), "mine", 0)

    expect(result).toMatchObject({ ok: false, reason: "not-file" })
  })

  it("can refuse a directory", async () => {
    const result = await writeProjectFile(root, root, "mine", 0)

    expect(result).toMatchObject({ ok: false, reason: "outside-project" })
  })
})
