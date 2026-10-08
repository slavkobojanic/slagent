import { beforeEach, describe, expect, it, vi } from "vitest"
import { TitleModelPresenter } from "@/features/settings/title-model/title-model-presenter/title-model-presenter"
import { TitleModelStore } from "@/features/settings/title-model/title-model-store/title-model-store"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { createMockInstance } from "@/test/create-mock-instance"

function setup() {
  const api = createMockInstance<API>(["setTitleModel"])
  const store = new TitleModelStore()
  const presenter = new TitleModelPresenter(store, api, nullLog())
  return { api, store, presenter }
}

describe("TitleModelPresenter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("handleChange", () => {
    it("can save the chosen model", async () => {
      const { api, store, presenter } = setup()
      api.setTitleModel.mockResolvedValue(undefined)

      await presenter.handleChange("deepseek/deepseek-v4-flash-0731")

      expect(api.setTitleModel).toHaveBeenCalledWith("deepseek/deepseek-v4-flash-0731")
      expect(store.error).toBeNull()
    })

    it("can show the error when saving fails", async () => {
      const { api, store, presenter } = setup()
      api.setTitleModel.mockRejectedValue(new Error("Pi is not ready."))

      await presenter.handleChange("deepseek/deepseek-v4-flash-0731")

      expect(store.error).toBe("Pi is not ready.")
    })
  })
})
