import { beforeEach, describe, expect, it, vi } from "vitest"
import { EMPTY_PERSONALISATION, type AppMeta, type McpServerStatus } from "@shared/types"
import { McpSettingsPresenter } from "@/features/settings/mcp-settings/mcp-settings-presenter/mcp-settings-presenter"
import { McpSettingsStore } from "@/features/settings/mcp-settings/mcp-settings-store/mcp-settings-store"
import type { API } from "@/ipc/api"
import { nullLog } from "@/log/log"
import { MetaStore } from "@/mirror/meta-store/meta-store"
import { McpStore } from "@/state/mcp/mcp-store/mcp-store"
import { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"
import { createMockInstance } from "@/test/create-mock-instance"

const docs: McpServerStatus = {
  name: "docs",
  state: "needs-auth",
  enabled: true,
  oauth: true,
  tools: 0,
  description: null,
  detail: null,
}

const wiki: McpServerStatus = { ...docs, name: "wiki", state: "connected" }

function metaWith(overrides: Partial<AppMeta>): AppMeta {
  return {
    ready: false,
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
    routing: "balance",
    effort: "medium",
    titleModelId: null,
    titleModels: [],
    personalisation: EMPTY_PERSONALISATION,
    ...overrides,
  }
}

function setup() {
  const api = createMockInstance<API>(["mcpList", "mcpSignIn", "mcpSignOut", "mcpSetEnabled"])
  api.mcpList.mockResolvedValue([])
  const store = new McpSettingsStore()
  const servers = new McpStore()
  const overlay = new OverlayStore()
  const meta = new MetaStore()
  const presenter = new McpSettingsPresenter(store, api, servers, overlay, meta, nullLog())
  return { api, store, servers, overlay, meta, presenter }
}

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe("McpSettingsPresenter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("start", () => {
    it("can load the servers when the dialog opens", async () => {
      const { api, servers, overlay, presenter } = setup()
      api.mcpList.mockResolvedValue([docs])
      presenter.start()

      overlay.setOpen("settings", true)
      await flush()

      expect(api.mcpList).toHaveBeenCalledOnce()
      expect(servers.servers).toEqual([docs])
      presenter.stop()
    })

    it("can load the servers when the mirror becomes ready", async () => {
      const { api, meta, presenter } = setup()
      presenter.start()

      meta.setMeta(metaWith({ ready: true }))
      await flush()

      expect(api.mcpList).toHaveBeenCalledOnce()
      presenter.stop()
    })

    it("can load the servers at start when the mirror is already ready", async () => {
      const { api, meta, presenter } = setup()
      meta.setMeta(metaWith({ ready: true }))

      presenter.start()
      await flush()

      expect(api.mcpList).toHaveBeenCalledOnce()
      presenter.stop()
    })

    it("can clear an error left by an earlier visit when the dialog opens", async () => {
      const { store, overlay, presenter } = setup()
      store.setError("Offline")
      presenter.start()

      overlay.setOpen("settings", true)
      await flush()

      expect(store.error).toBeNull()
      presenter.stop()
    })

    it("can keep the servers it has when a background load fails", async () => {
      const { api, store, servers, overlay, presenter } = setup()
      servers.setServers([wiki])
      api.mcpList.mockRejectedValue(new Error("Offline"))
      presenter.start()

      overlay.setOpen("settings", true)
      await flush()

      expect(servers.servers).toEqual([wiki])
      expect(store.error).toBeNull()
      presenter.stop()
    })
  })

  describe("stop", () => {
    it("can stop loading when the dialog opens", async () => {
      const { api, overlay, presenter } = setup()
      presenter.start()
      presenter.stop()

      overlay.setOpen("settings", true)
      await flush()

      expect(api.mcpList).not.toHaveBeenCalled()
    })
  })

  describe("handleRefresh", () => {
    it("can refresh the servers and clear any busy row", async () => {
      const { api, store, servers, presenter } = setup()
      store.setBusyName("docs")
      api.mcpList.mockResolvedValue([docs, wiki])

      await presenter.handleRefresh()

      expect(servers.servers).toEqual([docs, wiki])
      expect(store.busyName).toBeNull()
      expect(store.refreshing).toBe(false)
    })

    it("can show the error when a refresh fails", async () => {
      const { api, store, presenter } = setup()
      api.mcpList.mockRejectedValue(new Error("Offline"))

      await presenter.handleRefresh()

      expect(store.error).toBe("Offline")
      expect(store.refreshing).toBe(false)
    })
  })

  describe("handleSignIn", () => {
    it("can sign in to a server and store the list it returns", async () => {
      const { api, store, servers, presenter } = setup()
      api.mcpSignIn.mockResolvedValue([{ ...docs, state: "connected" }])

      await presenter.handleSignIn("docs")

      expect(api.mcpSignIn).toHaveBeenCalledWith("docs")
      expect(servers.servers).toEqual([{ ...docs, state: "connected" }])
      expect(store.busyName).toBeNull()
    })

    it("can show the error when sign-in fails", async () => {
      const { api, store, presenter } = setup()
      api.mcpSignIn.mockRejectedValue(new Error("Browser closed"))

      await presenter.handleSignIn("docs")

      expect(store.error).toBe("Browser closed")
      expect(store.busyName).toBeNull()
    })
  })

  describe("handleSignOut", () => {
    it("can sign out of a server and store the list it returns", async () => {
      const { api, servers, presenter } = setup()
      api.mcpSignOut.mockResolvedValue([{ ...docs, state: "needs-auth" }])

      await presenter.handleSignOut("docs")

      expect(api.mcpSignOut).toHaveBeenCalledWith("docs")
      expect(servers.servers).toEqual([{ ...docs, state: "needs-auth" }])
    })
  })

  describe("handleSetEnabled", () => {
    it("can disable a server and store the list it returns", async () => {
      const { api, servers, presenter } = setup()
      api.mcpSetEnabled.mockResolvedValue([{ ...wiki, enabled: false, state: "disabled" }])

      await presenter.handleSetEnabled("wiki", false)

      expect(api.mcpSetEnabled).toHaveBeenCalledWith("wiki", false)
      expect(servers.servers).toEqual([{ ...wiki, enabled: false, state: "disabled" }])
    })
  })
})
