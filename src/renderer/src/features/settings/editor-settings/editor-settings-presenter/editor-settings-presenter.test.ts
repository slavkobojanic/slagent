import { describe, expect, it, vi } from "vitest"
import { DEFAULT_EDITOR_PREFS } from "@shared/editor"
import type { AppMeta } from "@shared/types"
import { EditorSettingsStore } from "@/features/settings/editor-settings/editor-settings-store/editor-settings-store"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { MetaStore } from "@/mirror/meta-store/meta-store"
import { createMockInstance } from "@/test/create-mock-instance"
import { EditorSettingsPresenter } from "./editor-settings-presenter"

function setup(editor = DEFAULT_EDITOR_PREFS) {
  const store = new EditorSettingsStore()
  const api = createMockInstance<API>(["setEditorPrefs"])
  vi.mocked(api.setEditorPrefs).mockResolvedValue(undefined)
  const metaStore = new MetaStore()
  metaStore.setMeta({ editor } as AppMeta)
  const presenter = new EditorSettingsPresenter(store, api, metaStore, nullLog())
  return { store, api, metaStore, presenter }
}

describe("EditorSettingsPresenter", () => {
  describe("handleFontSize", () => {
    it("can save the new size with the other settings unchanged", async () => {
      const { presenter, api } = setup()

      await presenter.handleFontSize(18)

      expect(api.setEditorPrefs).toHaveBeenCalledWith({ ...DEFAULT_EDITOR_PREFS, fontSize: 18 })
    })

    it("can clamp a size outside the range", async () => {
      const { presenter, api } = setup()

      await presenter.handleFontSize(500)

      expect(api.setEditorPrefs).toHaveBeenCalledWith(expect.objectContaining({ fontSize: 32 }))
    })

    it("can keep the stored size when the field is blank", async () => {
      const { presenter, api } = setup()

      await presenter.handleFontSize(Number.NaN)

      expect(api.setEditorPrefs).not.toHaveBeenCalled()
    })
  })

  describe("handleTabSize", () => {
    it("can save the new tab size", async () => {
      const { presenter, api } = setup()

      await presenter.handleTabSize(4)

      expect(api.setEditorPrefs).toHaveBeenCalledWith(expect.objectContaining({ tabSize: 4 }))
    })

    it("can clamp a tab size outside the range", async () => {
      const { presenter, api } = setup()

      await presenter.handleTabSize(0)

      expect(api.setEditorPrefs).toHaveBeenCalledWith(expect.objectContaining({ tabSize: 1 }))
    })
  })

  describe("flags", () => {
    it("can save word wrap", async () => {
      const { presenter, api } = setup()

      await presenter.handleWordWrap(true)

      expect(api.setEditorPrefs).toHaveBeenCalledWith(expect.objectContaining({ wordWrap: true }))
    })

    it("can save the minimap", async () => {
      const { presenter, api } = setup()

      await presenter.handleMinimap(true)

      expect(api.setEditorPrefs).toHaveBeenCalledWith(expect.objectContaining({ minimap: true }))
    })
  })

  describe("handleTogglePack", () => {
    it("can switch a pack on", async () => {
      const { presenter, api } = setup({ ...DEFAULT_EDITOR_PREFS, packs: ["json"] })

      await presenter.handleTogglePack("java")

      expect(api.setEditorPrefs).toHaveBeenCalledWith(expect.objectContaining({ packs: ["json", "java"] }))
    })

    it("can switch a pack off", async () => {
      const { presenter, api } = setup({ ...DEFAULT_EDITOR_PREFS, packs: ["json", "java"] })

      await presenter.handleTogglePack("java")

      expect(api.setEditorPrefs).toHaveBeenCalledWith(expect.objectContaining({ packs: ["json"] }))
    })
  })

  describe("errors", () => {
    it("can put a failed save on the store", async () => {
      const { presenter, api, store } = setup()
      vi.mocked(api.setEditorPrefs).mockRejectedValue(new Error("offline"))

      await presenter.handleWordWrap(true)

      expect(store.error).toBe("offline")
    })

    it("can clear an earlier error on the next save", async () => {
      const { presenter, store } = setup()
      store.setError("old")

      await presenter.handleWordWrap(true)

      expect(store.error).toBeNull()
    })
  })

  it("can fall back to the defaults before meta has loaded", async () => {
    const { presenter, api, metaStore } = setup()
    metaStore.meta = null

    await presenter.handleMinimap(true)

    expect(api.setEditorPrefs).toHaveBeenCalledWith({ ...DEFAULT_EDITOR_PREFS, minimap: true })
  })
})
