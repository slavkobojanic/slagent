import { describe, expect, it } from "vitest"
import { FileViewerStore } from "@/features/changes/file-viewer-store/file-viewer-store"

describe("FileViewerStore", () => {
  describe("highlighterReady", () => {
    it("can start not ready until Pierre's highlighter has loaded", () => {
      expect(new FileViewerStore().highlighterReady).toBe(false)
    })
  })

  describe("setHighlighterReady", () => {
    it("can mark the highlighter as loaded", () => {
      const store = new FileViewerStore()
      store.setHighlighterReady(true)

      expect(store.highlighterReady).toBe(true)
    })
  })
})
