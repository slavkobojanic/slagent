import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import { EMPTY_PERSONALISATION, type AppMeta } from "@shared/types"
import { PersonalisationSettingsPresenter } from "@/features/settings/personalisation-settings/personalisation-settings-presenter/personalisation-settings-presenter"
import { PersonalisationSettingsStore } from "@/features/settings/personalisation-settings/personalisation-settings-store/personalisation-settings-store"
import { SettingsStore } from "@/features/settings/settings-store/settings-store"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { MetaStore } from "@/mirror/meta-store/meta-store"
import { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"
import { createMockInstance } from "@/test/create-mock-instance"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function metaWith(overrides: Partial<AppMeta>): AppMeta {
  return {
    ready: true,
    error: null,
    cwd: "",
    agentDir: "/agent",
    modelId: null,
    modelName: null,
    modelProvider: null,
    models: [],
    openRouter: { configured: false, source: null, type: null, envKey: false },
    extensions: [],
    extensionErrors: [],
    usageTotals: { tokens: 0, cost: 0, chats: 0 },
    personalisation: EMPTY_PERSONALISATION,
    ...overrides,
  }
}

function setup() {
  const api = createMockInstance<API>(["setPersonalisation"])
  const meta = new MetaStore()
  const overlay = new OverlayStore()
  const tabs = new SettingsStore()
  const store = new PersonalisationSettingsStore()
  const presenter = new PersonalisationSettingsPresenter(store, api, meta, overlay, tabs, nullLog())
  return { api, meta, overlay, tabs, store, presenter }
}

describe("PersonalisationSettingsPresenter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("handlePatch", () => {
    it("can record a field change in the draft", () => {
      const { store, presenter } = setup()

      presenter.handlePatch({ notes: "Use tabs." })

      expect(store.draft.notes).toBe("Use tabs.")
    })
  })

  describe("handleSave", () => {
    it("can save the draft and report it", async () => {
      const { api, meta, store, presenter } = setup()
      meta.setMeta(metaWith({}))
      api.setPersonalisation.mockResolvedValue(undefined)
      presenter.handlePatch({ tone: "direct" })

      await presenter.handleSave()

      expect(api.setPersonalisation).toHaveBeenCalledWith({ ...EMPTY_PERSONALISATION, tone: "direct" })
      expect(store.saving).toBe(false)
      expect(toast.success).toHaveBeenCalledWith("Personalisation saved")
    })

    it("can keep the draft and show the error when saving fails", async () => {
      const { api, meta, store, presenter } = setup()
      meta.setMeta(metaWith({}))
      api.setPersonalisation.mockRejectedValue(new Error("Disk full"))
      presenter.handlePatch({ tone: "direct" })

      await presenter.handleSave()

      expect(store.draft.tone).toBe("direct")
      expect(store.error).toBe("Disk full")
      expect(store.saving).toBe(false)
      expect(toast.success).not.toHaveBeenCalled()
    })

    it("can ignore a save when nothing has changed from the saved settings", async () => {
      const { api, meta, store, presenter } = setup()
      meta.setMeta(metaWith({}))
      store.reset(EMPTY_PERSONALISATION)

      await presenter.handleSave()

      expect(api.setPersonalisation).not.toHaveBeenCalled()
    })
  })

  describe("start", () => {
    it("can start the draft from the saved settings when the section is shown", () => {
      const { meta, overlay, tabs, store, presenter } = setup()
      meta.setMeta(metaWith({ personalisation: { ...EMPTY_PERSONALISATION, tone: "friendly" } }))
      presenter.start()
      tabs.setTab("personalisation")

      overlay.setOpen("settings", true)

      expect(store.draft.tone).toBe("friendly")
      presenter.stop()
    })

    it("can discard an unsaved draft when the section is shown again", () => {
      const { meta, overlay, tabs, store, presenter } = setup()
      meta.setMeta(metaWith({}))
      presenter.start()
      tabs.setTab("personalisation")
      overlay.setOpen("settings", true)
      presenter.handlePatch({ tone: "direct" })

      overlay.setOpen("settings", false)
      overlay.setOpen("settings", true)

      expect(store.draft.tone).toBeNull()
      presenter.stop()
    })

    it("can leave the draft alone while another section is shown", () => {
      const { meta, overlay, store, presenter } = setup()
      meta.setMeta(metaWith({ personalisation: { ...EMPTY_PERSONALISATION, tone: "friendly" } }))
      presenter.start()
      presenter.handlePatch({ brevity: "terse" })

      overlay.setOpen("settings", true)

      expect(store.draft.brevity).toBe("terse")
      presenter.stop()
    })
  })

  describe("stop", () => {
    it("can stop resetting the draft when the section is shown", () => {
      const { meta, overlay, tabs, store, presenter } = setup()
      meta.setMeta(metaWith({ personalisation: { ...EMPTY_PERSONALISATION, tone: "friendly" } }))
      presenter.start()
      presenter.stop()
      tabs.setTab("personalisation")

      overlay.setOpen("settings", true)

      expect(store.draft.tone).toBeNull()
    })
  })
})
