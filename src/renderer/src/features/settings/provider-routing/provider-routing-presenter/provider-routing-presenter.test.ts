import { beforeEach, describe, expect, it, vi } from "vitest"
import { ProviderRoutingPresenter } from "@/features/settings/provider-routing/provider-routing-presenter/provider-routing-presenter"
import { ProviderRoutingStore } from "@/features/settings/provider-routing/provider-routing-store/provider-routing-store"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { createMockInstance } from "@/test/create-mock-instance"

function setup() {
  const api = createMockInstance<API>(["setRouting"])
  const store = new ProviderRoutingStore()
  const presenter = new ProviderRoutingPresenter(store, api, nullLog())
  return { api, store, presenter }
}

describe("ProviderRoutingPresenter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("handleChange", () => {
    it("can save the chosen preference", async () => {
      const { api, store, presenter } = setup()
      api.setRouting.mockResolvedValue(undefined)

      await presenter.handleChange("speed")

      expect(api.setRouting).toHaveBeenCalledWith("speed")
      expect(store.error).toBeNull()
    })

    it("can show the error when saving fails", async () => {
      const { api, store, presenter } = setup()
      api.setRouting.mockRejectedValue(new Error("Pi is not ready."))

      await presenter.handleChange("cost")

      expect(store.error).toBe("Pi is not ready.")
    })
  })
})
