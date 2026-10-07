import { describe, expect, it } from "vitest"
import { DraftsStore } from "@/features/composer/drafts-store/drafts-store"

describe("DraftsStore", () => {
  describe("read", () => {
    it("can return an empty string for a chat with no draft", () => {
      expect(new DraftsStore().read("p:c")).toBe("")
    })

    it("can return the text written for the chat", () => {
      const store = new DraftsStore()
      store.write("p:c", "hello")

      expect(store.read("p:c")).toBe("hello")
    })
  })

  describe("write", () => {
    it("can save a draft and report the change", () => {
      const store = new DraftsStore()

      expect(store.write("p:c", "hello")).toBe(true)
    })

    it("can remove a draft when its text is blank, and report the change", () => {
      const store = new DraftsStore()
      store.write("p:c", "hello")

      expect(store.write("p:c", "   ")).toBe(true)
      expect(store.read("p:c")).toBe("")
    })

    it("can report no change when a blank write has no draft to remove", () => {
      expect(new DraftsStore().write("p:c", "")).toBe(false)
    })

    it("can drop the oldest drafts once there are more than 100", () => {
      const store = new DraftsStore()
      for (let index = 0; index <= 100; index += 1) {
        store.write(`k${index}`, `t${index}`)
      }

      expect(store.read("k0")).toBe("")
      expect(store.read("k1")).toBe("t1")
      expect(store.read("k100")).toBe("t100")
    })
  })

  describe("replace", () => {
    it("can swap in the drafts that were loaded", () => {
      const store = new DraftsStore()
      store.replace({ "p:c": "loaded" })

      expect(store.read("p:c")).toBe("loaded")
    })
  })
})
