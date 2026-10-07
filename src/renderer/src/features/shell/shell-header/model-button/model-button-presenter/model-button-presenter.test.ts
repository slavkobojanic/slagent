import { describe, expect, it } from "vitest"
import { ModelButtonPresenter } from "@/features/shell/shell-header/model-button/model-button-presenter/model-button-presenter"
import { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"

describe("ModelButtonPresenter", () => {
  describe("open", () => {
    it("can open the model dialog", () => {
      const overlayStore = new OverlayStore()
      const presenter = new ModelButtonPresenter(overlayStore)

      presenter.open()

      expect(overlayStore.modelOpen).toBe(true)
    })
  })
})
