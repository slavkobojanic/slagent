import { mkdtemp, readFile, realpath, rm, stat, symlink, utimes, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { writeProjectFile } from "./write-file"

describe("writeProjectFile", () => {
  let root: string
  let outside: string

  beforeEach(async () => {
    // The real path, so the tests do not depend on the temp folder being a symlink.
    root = await realpath(await mkdtemp(join(tmpdir(), "slagent-write-")))
    outside = await realpath(await mkdtemp(join(tmpdir(), "slagent-outside-")))
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

  it("can refuse the project folder itself", async () => {
    const result = await writeProjectFile(root, root, "mine", 0)

    expect(result).toMatchObject({ ok: false, reason: "outside-project" })
  })

  it("can refuse a directory inside the project", async () => {
    const dir = join(root, "sub")
    await (await import("node:fs/promises")).mkdir(dir)

    const result = await writeProjectFile(root, dir, "mine", 0)

    expect(result).toMatchObject({ ok: false, reason: "not-file" })
  })

  it("can save through a symlinked path to the project", async () => {
    const alias = join(outside, "alias")
    await symlink(root, alias)
    const real = join(root, "a.txt")
    await writeFile(real, "old")
    const { mtimeMs } = await stat(real)

    const result = await writeProjectFile(alias, join(alias, "a.txt"), "new", mtimeMs)

    expect(result.ok).toBe(true)
    expect(await readFile(real, "utf8")).toBe("new")
  })

  it("can refuse a symlink inside the project that leads outside it", async () => {
    const secret = join(outside, "secret.txt")
    await writeFile(secret, "old")
    const link = join(root, "link.txt")
    await symlink(secret, link)
    const { mtimeMs } = await stat(secret)

    const result = await writeProjectFile(root, link, "mine", mtimeMs)

    expect(result).toMatchObject({ ok: false, reason: "outside-project" })
    expect(await readFile(secret, "utf8")).toBe("old")
  })
})
