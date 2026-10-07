import { describe, expect, it } from "vitest"
import { SettingsButtonPresenter } from "@/features/shell/shell-header/settings-button/settings-button-presenter/settings-button-presenter"
import { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"

describe("SettingsButtonPresenter", () => {
  describe("open", () => {
    it("can open the settings dialog", () => {
      const overlayStore = new OverlayStore()
      const presenter = new SettingsButtonPresenter(overlayStore)

      presenter.open()

      expect(overlayStore.settingsOpen).toBe(true)
    })
  })
})
