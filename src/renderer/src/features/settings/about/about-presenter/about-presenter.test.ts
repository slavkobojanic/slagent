import { describe, expect, it, vi } from "vitest"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import { AboutStore } from "../about-store/about-store"
import { AboutPresenter } from "./about-presenter"

describe("AboutPresenter", () => {
  it("loads the app version into the store", async () => {
    const store = new AboutStore()
    const api = {
      onUpdateReady: () => () => {},
      appVersion: () => Promise.resolve("0.5.4"),
      updateStatus: () => Promise.resolve(null),
    } as unknown as API
    const log = { debug: vi.fn() } as unknown as Log

    new AboutPresenter(store, api, log).start()
    await vi.waitFor(() => expect(store.version).toBe("0.5.4"))
  })
})
