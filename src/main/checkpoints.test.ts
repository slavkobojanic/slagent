import { mkdtemp, writeFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { CheckpointStore } from "./checkpoints"

describe("CheckpointStore", () => {
  let cwd: string
  let gitDir: string
  let store: CheckpointStore

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), "slagent-checkpoints-"))
    // The store lives outside the folder it snapshots, like the app's Application Support.
    gitDir = await mkdtemp(join(tmpdir(), "slagent-checkpoints-git-"))
    store = new CheckpointStore(cwd, gitDir)
  })

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true })
  })

  const write = (name: string, text: string) => writeFile(join(cwd, name), text)

  describe("diff", () => {
    it("can show the changes made since a snapshot", async () => {
      await write("a.txt", "one\n")
      const before = await store.snapshot("before")
      expect(before).toBeTruthy()
      await write("a.txt", "one\ntwo\n")

      const diff = await store.diff(before!)

      expect(diff).toContain("+two")
    })

    it("can be empty when nothing changed since a snapshot", async () => {
      await write("a.txt", "one\n")
      const before = await store.snapshot("before")
      expect(before).toBeTruthy()

      const diff = await store.diff(before!)

      expect(diff.trim()).toBe("")
    })

    it("can diff two snapshots instead of the current folder", async () => {
      await write("a.txt", "one\n")
      const start = await store.snapshot("start")
      expect(start).toBeTruthy()
      await write("a.txt", "one\ntwo\n")
      const end = await store.snapshot("end")
      expect(end).toBeTruthy()

      const diff = await store.diff(end!, start!)

      expect(diff).toContain("+two")
    })
  })
})
