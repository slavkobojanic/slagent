import { describe, expect, it } from "vitest"
import { EditorStore } from "./editor-store"

describe("EditorStore", () => {
  it("can start idle with no page", () => {
    const store = new EditorStore()

    expect(store).toMatchObject({ status: "idle", error: null, url: null })
  })

  describe("setUrl", () => {
    it("can hold the page while it loads", () => {
      const store = new EditorStore()
      store.setFailed("boom")

      store.setUrl("http://127.0.0.1:1/")

      expect(store).toMatchObject({ url: "http://127.0.0.1:1/", status: "loading", error: null })
    })
  })

  describe("setReady", () => {
    it("can mark the page loaded", () => {
      const store = new EditorStore()
      store.setUrl("http://127.0.0.1:1/")

      store.setReady()

      expect(store.status).toBe("ready")
    })
  })

  describe("setFailed", () => {
    it("can record why the editor could not start", () => {
      const store = new EditorStore()

      store.setFailed("The editor server stopped.")

      expect(store).toMatchObject({ status: "failed", error: "The editor server stopped." })
    })
  })

  describe("reset", () => {
    it("can forget the page for a new project", () => {
      const store = new EditorStore()
      store.setUrl("http://127.0.0.1:1/")

      store.reset()

      expect(store).toMatchObject({ status: "idle", url: null, error: null })
    })
  })
})
