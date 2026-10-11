import { describe, expect, it } from "vitest"
import { FileTreeStore } from "./file-tree-store"

function seeded(): FileTreeStore {
  const store = new FileTreeStore()
  store.setChildren("", [
    { name: "src", dir: true },
    { name: "README.md", dir: false },
  ])
  store.setChildren("src", [
    { name: "ui", dir: true },
    { name: "index.ts", dir: false },
  ])
  store.setChildren("src/ui", [{ name: "button.tsx", dir: false }])
  return store
}

describe("FileTreeStore", () => {
  describe("rows", () => {
    it("can list only the root while every folder is collapsed", () => {
      expect(seeded().rows.map((row) => row.path)).toEqual(["src", "README.md"])
    })

    it("can list an expanded folder's children right under it, one level deeper", () => {
      const store = seeded()
      store.setExpanded("src", true)

      expect(store.rows.map((row) => [row.path, row.depth])).toEqual([
        ["src", 0],
        ["src/ui", 1],
        ["src/index.ts", 1],
        ["README.md", 0],
      ])
    })

    it("can list nested expanded folders", () => {
      const store = seeded()
      store.setExpanded("src", true)
      store.setExpanded("src/ui", true)

      expect(store.rows.map((row) => row.path)).toContain("src/ui/button.tsx")
    })

    it("can mark expanded and loading folders", () => {
      const store = seeded()
      store.setExpanded("src", true)
      store.setLoading("src/ui", true)

      expect(store.rows.find((row) => row.path === "src")?.expanded).toBe(true)
      expect(store.rows.find((row) => row.path === "src/ui")?.loading).toBe(true)
    })

    it("can show an expanded folder with no contents loaded yet as empty", () => {
      const store = new FileTreeStore()
      store.setChildren("", [{ name: "src", dir: true }])
      store.setExpanded("src", true)

      expect(store.rows.map((row) => row.path)).toEqual(["src"])
    })

    it("can never mark a file as expanded", () => {
      const store = seeded()
      store.setExpanded("README.md", true)

      expect(store.rows.find((row) => row.path === "README.md")?.expanded).toBe(false)
    })
  })

  describe("setExpanded and setLoading", () => {
    it("can collapse a folder again", () => {
      const store = seeded()
      store.setExpanded("src", true)

      store.setExpanded("src", false)

      expect(store.expanded).toEqual([])
    })

    it("can track a path once", () => {
      const store = seeded()

      store.setExpanded("src", true)
      store.setExpanded("src", true)
      store.setLoading("src", true)
      store.setLoading("src", true)

      expect(store.expanded).toEqual(["src"])
      expect(store.loading).toEqual(["src"])
    })
  })

  describe("reset", () => {
    it("can forget everything for a new project", () => {
      const store = seeded()
      store.setExpanded("src", true)
      store.setError("boom")

      store.reset()

      expect(store.rows).toEqual([])
      expect(store.expanded).toEqual([])
      expect(store.error).toBeNull()
    })
  })
})
