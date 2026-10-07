import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import {
  EMPTY_PERSONALISATION,
  PINNED_FILE_CHAR_LIMIT,
  PINNED_TOTAL_CHAR_LIMIT,
  type AppMeta,
  type PinnedFile,
} from "@shared/types"
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
  const api = createMockInstance<API>(["setPersonalisation", "pickContextFiles"])
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

  describe("handlePickFiles", () => {
    it("can pin picked files and report it", async () => {
      const { api, store, presenter } = setup()
      api.pickContextFiles.mockResolvedValue([
        { name: "GUIDELINES.md", content: "Use tabs." },
        { name: "DESIGN.md", content: "Dark mode only." },
      ])

      await presenter.handlePickFiles()

      expect(store.draft.pinnedFiles).toEqual([
        { name: "GUIDELINES.md", content: "Use tabs." },
        { name: "DESIGN.md", content: "Dark mode only." },
      ])
      expect(toast.success).toHaveBeenCalledWith("2 files pinned — save to apply")
    })

    it("can leave the draft alone when nothing is picked", async () => {
      const { api, store, presenter } = setup()
      api.pickContextFiles.mockResolvedValue([])

      await presenter.handlePickFiles()

      expect(store.draft.pinnedFiles).toBeNull()
      expect(toast.success).not.toHaveBeenCalled()
    })

    it("can reject a file over the per-file character limit", async () => {
      const { api, store, presenter } = setup()
      const big = "x".repeat(PINNED_FILE_CHAR_LIMIT + 1)
      api.pickContextFiles.mockResolvedValue([{ name: "BIG.md", content: big }])

      await presenter.handlePickFiles()

      expect(store.draft.pinnedFiles).toBeNull()
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("too large"), expect.anything())
    })

    it("can reject files that would push the total over the limit", async () => {
      const { api, store, presenter } = setup()
      const half = "x".repeat(Math.floor(PINNED_TOTAL_CHAR_LIMIT / 2))
      api.pickContextFiles.mockResolvedValue([
        { name: "A.md", content: half },
        { name: "B.md", content: half },
        { name: "C.md", content: half },
      ])

      await presenter.handlePickFiles()

      expect(store.draft.pinnedFiles).toEqual([
        { name: "A.md", content: half },
        { name: "B.md", content: half },
      ])
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("C.md"), expect.anything())
    })

    it("can replace a pinned file with the same name", async () => {
      const { api, store, presenter } = setup()
      store.reset({ ...EMPTY_PERSONALISATION, pinnedFiles: [{ name: "GUIDELINES.md", content: "old" }] })
      api.pickContextFiles.mockResolvedValue([{ name: "GUIDELINES.md", content: "new" }])

      await presenter.handlePickFiles()

      expect(store.draft.pinnedFiles).toEqual([{ name: "GUIDELINES.md", content: "new" }])
    })

    it("can show an error when the picker fails", async () => {
      const { api, presenter } = setup()
      api.pickContextFiles.mockRejectedValue(new Error("No picker"))

      await presenter.handlePickFiles()

      expect(toast.error).toHaveBeenCalledWith("No picker")
    })
  })

  describe("handleRemoveFile", () => {
    it("can remove a pinned file from the draft", () => {
      const { store, presenter } = setup()
      const files: PinnedFile[] = [{ name: "GUIDELINES.md", content: "Use tabs." }]
      store.reset({ ...EMPTY_PERSONALISATION, pinnedFiles: files })

      presenter.handleRemoveFile("GUIDELINES.md")

      expect(store.draft.pinnedFiles).toEqual([])
    })

    it("can ignore a name that is not pinned", () => {
      const { store, presenter } = setup()
      const files: PinnedFile[] = [{ name: "GUIDELINES.md", content: "Use tabs." }]
      store.reset({ ...EMPTY_PERSONALISATION, pinnedFiles: files })

      presenter.handleRemoveFile("DESIGN.md")

      expect(store.draft.pinnedFiles).toEqual(files)
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
