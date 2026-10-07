import { describe, expect, it } from "vitest"
import { AttachmentsStore, type ComposerAttachment } from "@/features/composer/attachments/attachments-store/attachments-store"

function attachment(overrides: Partial<ComposerAttachment> = {}): ComposerAttachment {
  return { id: "a1", name: "notes.txt", mimeType: "text/plain", url: "blob:notes", path: "", file: new File(["hi"], "notes.txt"), ...overrides }
}

describe("AttachmentsStore", () => {
  describe("chips", () => {
    it("can show a thumbnail for an image and no thumbnail for other files", () => {
      const store = new AttachmentsStore()
      store.setItems([
        attachment({ id: "img", name: "shot.png", mimeType: "image/png", url: "blob:shot" }),
        attachment({ id: "doc", name: "spec.pdf", mimeType: "application/pdf", url: "blob:spec" }),
      ])

      expect(store.chips).toEqual([
        { id: "img", name: "shot.png", imageUrl: "blob:shot" },
        { id: "doc", name: "spec.pdf", imageUrl: null },
      ])
    })

    it("can name a file with no name file", () => {
      const store = new AttachmentsStore()
      store.setItems([attachment({ name: "" })])

      expect(store.chips[0]?.name).toBe("file")
    })
  })
})
