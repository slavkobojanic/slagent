import { afterEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import type { API } from "@/ipc/api"
import { EmptyStatePresenter } from "@/features/transcript/message-list/empty-state/empty-state-presenter/empty-state-presenter"
import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"
import { createMockInstance } from "@/test/create-mock-instance"

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }))

function setup() {
  const api = createMockInstance<API>(["chooseFolder"])
  const overlayStore = createMockInstance<OverlayStore>(["setOpen"])
  const presenter = new EmptyStatePresenter(api, overlayStore)
  return { api, overlayStore, presenter }
}

afterEach(() => {
  vi.mocked(toast.error).mockClear()
})

describe("EmptyStatePresenter", () => {
  describe("chooseFolder", () => {
    it("can ask the main process for a folder", async () => {
      const { api, presenter } = setup()
      api.chooseFolder.mockResolvedValue(undefined)

      await presenter.chooseFolder()

      expect(api.chooseFolder).toHaveBeenCalledTimes(1)
      expect(toast.error).not.toHaveBeenCalled()
    })

    it("can report the error when the folder cannot be chosen", async () => {
      const { api, presenter } = setup()
      api.chooseFolder.mockRejectedValue(new Error("Dialog closed"))

      await presenter.chooseFolder()

      expect(toast.error).toHaveBeenCalledWith("Dialog closed")
    })
  })

  describe("openSettings", () => {
    it("can open the settings dialog to add an API key", () => {
      const { overlayStore, presenter } = setup()

      presenter.openSettings()

      expect(overlayStore.setOpen).toHaveBeenCalledWith("settings", true)
    })
  })
})
