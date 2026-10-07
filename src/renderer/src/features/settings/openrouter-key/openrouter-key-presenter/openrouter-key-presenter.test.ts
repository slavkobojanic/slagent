import { beforeEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"
import { OpenRouterKeyPresenter } from "@/features/settings/openrouter-key/openrouter-key-presenter/openrouter-key-presenter"
import { OpenRouterKeyStore } from "@/features/settings/openrouter-key/openrouter-key-store/openrouter-key-store"
import { SettingsStore } from "@/features/settings/settings-store/settings-store"
import type { AppService } from "@/ipc/app-service/app-service"
import type { SettingsService } from "@/ipc/settings-service/settings-service"
import { OverlayStore } from "@/state/overlay-store"
import { createMockInstance } from "@/test/create-mock-instance"

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

function setup() {
  const settings = createMockInstance<SettingsService>(["saveOpenRouterKey", "logoutOpenRouter"])
  const app = createMockInstance<AppService>(["openExternal"])
  const overlay = new OverlayStore()
  const tabs = new SettingsStore()
  const store = new OpenRouterKeyStore()
  const presenter = new OpenRouterKeyPresenter(store, settings, app, overlay, tabs)
  return { settings, app, overlay, tabs, store, presenter }
}

describe("OpenRouterKeyPresenter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("handleSave", () => {
    it("can save the trimmed key, clear the field and report it", async () => {
      const { settings, store, presenter } = setup()
      settings.saveOpenRouterKey.mockResolvedValue(undefined)
      presenter.handleApiKeyChange("  sk-or-1  ")

      await presenter.handleSave()

      expect(settings.saveOpenRouterKey).toHaveBeenCalledWith("sk-or-1")
      expect(store.apiKey).toBe("")
      expect(store.saving).toBe(false)
      expect(toast.success).toHaveBeenCalledWith("OpenRouter key saved")
    })

    it("can keep the key and show the error when saving fails", async () => {
      const { settings, store, presenter } = setup()
      settings.saveOpenRouterKey.mockRejectedValue(new Error("Invalid key"))
      presenter.handleApiKeyChange("sk-or-1")

      await presenter.handleSave()

      expect(store.apiKey).toBe("sk-or-1")
      expect(store.error).toBe("Invalid key")
      expect(store.saving).toBe(false)
      expect(toast.success).not.toHaveBeenCalled()
    })

    it("can ignore a save while the key is blank", async () => {
      const { settings, presenter } = setup()
      presenter.handleApiKeyChange("   ")

      await presenter.handleSave()

      expect(settings.saveOpenRouterKey).not.toHaveBeenCalled()
    })

    it("can ignore a save while another save is running", async () => {
      const { settings, store, presenter } = setup()
      presenter.handleApiKeyChange("sk-or-1")
      store.setSaving(true)

      await presenter.handleSave()

      expect(settings.saveOpenRouterKey).not.toHaveBeenCalled()
    })
  })

  describe("handleRemove", () => {
    it("can remove the saved key and report it", async () => {
      const { settings, store, presenter } = setup()
      settings.logoutOpenRouter.mockResolvedValue(undefined)

      await presenter.handleRemove()

      expect(settings.logoutOpenRouter).toHaveBeenCalledOnce()
      expect(store.removing).toBe(false)
      expect(toast.success).toHaveBeenCalledWith("OpenRouter credential removed")
    })

    it("can show the error when removing fails", async () => {
      const { settings, store, presenter } = setup()
      settings.logoutOpenRouter.mockRejectedValue(new Error("Locked"))

      await presenter.handleRemove()

      expect(store.error).toBe("Locked")
      expect(store.removing).toBe(false)
    })
  })

  describe("handleCreateKey", () => {
    it("can open the OpenRouter key page in the browser", () => {
      const { app, presenter } = setup()

      presenter.handleCreateKey()

      expect(app.openExternal).toHaveBeenCalledWith("https://openrouter.ai/keys")
    })
  })

  describe("handleApiKeyChange and handleToggleVisible", () => {
    it("can track the typed key and toggle whether it is shown", () => {
      const { store, presenter } = setup()

      presenter.handleApiKeyChange("sk-or-1")
      presenter.handleToggleVisible()

      expect(store.apiKey).toBe("sk-or-1")
      expect(store.visible).toBe(true)
    })
  })

  describe("start", () => {
    it("can empty the form when the general section is shown", () => {
      const { overlay, store, presenter } = setup()
      store.setApiKey("sk-or-1")
      presenter.start()

      overlay.setOpen("settings", true)

      expect(store.apiKey).toBe("")
      presenter.stop()
    })

    it("can keep the form while another section is shown", () => {
      const { overlay, tabs, store, presenter } = setup()
      store.setApiKey("sk-or-1")
      tabs.setTab("cli")
      presenter.start()

      overlay.setOpen("settings", true)

      expect(store.apiKey).toBe("sk-or-1")
      presenter.stop()
    })

    it("can empty the form again each time the dialog reopens", () => {
      const { overlay, store, presenter } = setup()
      presenter.start()
      overlay.setOpen("settings", true)
      store.setApiKey("sk-or-1")

      overlay.setOpen("settings", false)
      overlay.setOpen("settings", true)

      expect(store.apiKey).toBe("")
      presenter.stop()
    })
  })

  describe("stop", () => {
    it("can stop emptying the form when the section is shown", () => {
      const { overlay, store, presenter } = setup()
      presenter.start()
      presenter.stop()
      store.setApiKey("sk-or-1")

      overlay.setOpen("settings", true)

      expect(store.apiKey).toBe("sk-or-1")
    })
  })
})
