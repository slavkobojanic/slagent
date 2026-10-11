import { describe, expect, it, vi } from "vitest"
import { DEFAULT_EDITOR_PREFS, type EditorExtensionPref, type EditorExtensionResult } from "@shared/editor"
import type { AppMeta } from "@shared/types"
import { ExtensionSettingsStore } from "@/features/settings/editor-settings/extension-settings/extension-settings-store/extension-settings-store"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { MetaStore } from "@/mirror/meta-store/meta-store"
import { createMockInstance } from "@/test/create-mock-instance"
import { ExtensionSettingsPresenter } from "./extension-settings-presenter"

const vim: EditorExtensionPref = { id: "vscodevim.vim", version: "1.32.4", enabled: true }
const java: EditorExtensionPref = { id: "redhat.java", version: "1.0.0", enabled: true }
const hit: EditorExtensionResult = { id: "a.b", version: "1.0.0", name: "AB", description: "", downloads: 1, verified: false, iconUrl: null }

function setup(extensions: EditorExtensionPref[] = []) {
  const store = new ExtensionSettingsStore()
  const api = createMockInstance<API>(["searchEditorExtensions", "installEditorExtension", "uninstallEditorExtension", "setEditorPrefs"])
  vi.mocked(api.installEditorExtension).mockResolvedValue(undefined)
  vi.mocked(api.uninstallEditorExtension).mockResolvedValue(undefined)
  vi.mocked(api.setEditorPrefs).mockResolvedValue(undefined)
  const metaStore = new MetaStore()
  metaStore.setMeta({ editor: { ...DEFAULT_EDITOR_PREFS, extensions } } as AppMeta)
  const presenter = new ExtensionSettingsPresenter(store, api, metaStore, nullLog())
  return { store, api, metaStore, presenter }
}

describe("ExtensionSettingsPresenter", () => {
  describe("handleSearch", () => {
    it("can store the results of a search", async () => {
      const { presenter, api, store } = setup()
      vi.mocked(api.searchEditorExtensions).mockResolvedValue([hit])
      presenter.handleQuery("ab")

      await presenter.handleSearch()

      expect(api.searchEditorExtensions).toHaveBeenCalledWith("ab")
      expect(store.results).toEqual([hit])
      expect(store.searching).toBe(false)
    })

    it("can skip a blank query", async () => {
      const { presenter, api } = setup()

      await presenter.handleSearch()

      expect(api.searchEditorExtensions).not.toHaveBeenCalled()
    })

    it("can put a failed search on the store", async () => {
      const { presenter, api, store } = setup()
      vi.mocked(api.searchEditorExtensions).mockRejectedValue(new Error("offline"))
      presenter.handleQuery("ab")

      await presenter.handleSearch()

      expect(store.error).toBe("offline")
      expect(store.searching).toBe(false)
    })
  })

  describe("handleInstall", () => {
    it("can install and release the busy flag", async () => {
      const { presenter, api, store } = setup()

      await presenter.handleInstall("a.b")

      expect(api.installEditorExtension).toHaveBeenCalledWith("a.b")
      expect(store.busy).toEqual([])
    })

    it("can mark the extension busy while it installs", async () => {
      const { presenter, api, store } = setup()
      vi.mocked(api.installEditorExtension).mockReturnValue(new Promise(() => {}))

      void presenter.handleInstall("a.b")

      expect(store.busy).toEqual(["a.b"])
    })

    it("can report an install that fails and release the flag", async () => {
      const { presenter, api, store } = setup()
      vi.mocked(api.installEditorExtension).mockRejectedValue(new Error("checksum mismatch"))

      await presenter.handleInstall("a.b")

      expect(store.error).toBe("checksum mismatch")
      expect(store.busy).toEqual([])
    })
  })

  describe("handleUninstall", () => {
    it("can remove an extension", async () => {
      const { presenter, api } = setup([java])

      await presenter.handleUninstall("redhat.java")

      expect(api.uninstallEditorExtension).toHaveBeenCalledWith("redhat.java")
    })
  })

  describe("handleToggle", () => {
    it("can switch an installed extension off and leave the others alone", async () => {
      const { presenter, api } = setup([vim, java])

      await presenter.handleToggle("redhat.java")

      expect(api.setEditorPrefs).toHaveBeenCalledWith({ ...DEFAULT_EDITOR_PREFS, extensions: [vim, { ...java, enabled: false }] })
    })

    it("can switch a disabled extension on", async () => {
      const { presenter, api } = setup([{ ...java, enabled: false }])

      await presenter.handleToggle("redhat.java")

      expect(api.setEditorPrefs).toHaveBeenCalledWith(expect.objectContaining({ extensions: [java] }))
    })
  })

  describe("handleVim", () => {
    it("can install vim the first time it is switched on", async () => {
      const { presenter, api } = setup()

      await presenter.handleVim(true)

      expect(api.installEditorExtension).toHaveBeenCalledWith("vscodevim.vim")
      expect(api.setEditorPrefs).not.toHaveBeenCalled()
    })

    it("can do nothing when vim is switched off and was never installed", async () => {
      const { presenter, api } = setup()

      await presenter.handleVim(false)

      expect(api.installEditorExtension).not.toHaveBeenCalled()
      expect(api.setEditorPrefs).not.toHaveBeenCalled()
    })

    it("can enable an installed vim without installing it again", async () => {
      const { presenter, api } = setup([{ ...vim, enabled: false }])

      await presenter.handleVim(true)

      expect(api.installEditorExtension).not.toHaveBeenCalled()
      expect(api.setEditorPrefs).toHaveBeenCalledWith(expect.objectContaining({ extensions: [vim] }))
    })

    it("can disable vim and keep it installed", async () => {
      const { presenter, api } = setup([vim])

      await presenter.handleVim(false)

      expect(api.uninstallEditorExtension).not.toHaveBeenCalled()
      expect(api.setEditorPrefs).toHaveBeenCalledWith(expect.objectContaining({ extensions: [{ ...vim, enabled: false }] }))
    })
  })
})
