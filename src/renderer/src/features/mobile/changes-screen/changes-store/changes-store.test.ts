import { describe, expect, it } from "vitest"
import { SAMPLE_DIFF, makeStatus } from "@/features/changes/changes-fixtures"
import { MobileChangesStore } from "./changes-store"

describe("MobileChangesStore", () => {
  it("starts with nothing loaded and no badge count", () => {
    const store = new MobileChangesStore()

    expect(store.repo).toBe(false)
    expect(store.changedCount).toBe(0)
    expect(store.branchLabel).toBe("Changes")
    expect(store.emptyText).toContain("not a git repository")
  })

  it("can show a repo's status and its parsed diff", () => {
    const store = new MobileChangesStore()
    store.setStatus(makeStatus())
    store.setFiles(SAMPLE_DIFF)

    expect(store.repo).toBe(true)
    expect(store.changedCount).toBe(1)
    expect(store.branchLabel).toBe("main")
    expect(store.files).toHaveLength(1)
    expect(store.emptyText).toContain("No uncommitted changes")
  })

  it("can fall back to Detached when the branch is a detached head", () => {
    const store = new MobileChangesStore()
    store.setStatus(makeStatus({ branch: null }))

    expect(store.branchLabel).toBe("Detached")
  })

  it("can end the loading state", () => {
    const store = new MobileChangesStore()
    store.setLoading(true)
    expect(store.loading).toBe(true)
    store.setLoading(false)
    expect(store.loading).toBe(false)
  })
})
