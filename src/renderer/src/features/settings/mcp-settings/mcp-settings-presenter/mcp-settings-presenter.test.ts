import { beforeEach, describe, expect, it, vi } from "vitest"
import { EMPTY_PERSONALISATION, type AppMeta, type McpServerStatus } from "@shared/types"
import { McpSettingsPresenter } from "@/features/settings/mcp-settings/mcp-settings-presenter/mcp-settings-presenter"
import { McpSettingsStore } from "@/features/settings/mcp-settings/mcp-settings-store/mcp-settings-store"
import type { McpService } from "@/ipc/mcp-service/mcp-service"
import { MetaStore } from "@/mirror/meta-store"
import { McpStore } from "@/state/mcp-store"
import { OverlayStore } from "@/state/overlay-store"
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
    personalisation: EMPTY_PERSONALISATION,
    ...overrides,
  }
}

function setup() {
  const mcp = createMockInstance<McpService>(["mcpList", "mcpSignIn", "mcpSignOut", "mcpSetEnabled"])
  mcp.mcpList.mockResolvedValue([])
  const store = new McpSettingsStore()
  const servers = new McpStore()
  const overlay = new OverlayStore()
  const meta = new MetaStore()
  const presenter = new McpSettingsPresenter(store, servers, mcp, overlay, meta)
  return { mcp, store, servers, overlay, meta, presenter }
}

// Lets the promises started by a presenter settle before the test checks the result.
function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe("McpSettingsPresenter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("start", () => {
    it("can load the servers when the dialog opens", async () => {
      const { mcp, servers, overlay, presenter } = setup()
      mcp.mcpList.mockResolvedValue([docs])
      presenter.start()

      overlay.setOpen("settings", true)
      await flush()

      expect(mcp.mcpList).toHaveBeenCalledOnce()
      expect(servers.servers).toEqual([docs])
      presenter.stop()
    })

    it("can load the servers when the mirror becomes ready", async () => {
      const { mcp, meta, presenter } = setup()
      presenter.start()

      meta.setMeta(metaWith({ ready: true }))
      await flush()

      expect(mcp.mcpList).toHaveBeenCalledOnce()
      presenter.stop()
    })

    it("can load the servers at start when the mirror is already ready", async () => {
      const { mcp, meta, presenter } = setup()
      meta.setMeta(metaWith({ ready: true }))

      presenter.start()
      await flush()

      expect(mcp.mcpList).toHaveBeenCalledOnce()
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
      const { mcp, store, servers, overlay, presenter } = setup()
      servers.setServers([wiki])
      mcp.mcpList.mockRejectedValue(new Error("Offline"))
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
      const { mcp, overlay, presenter } = setup()
      presenter.start()
      presenter.stop()

      overlay.setOpen("settings", true)
      await flush()

      expect(mcp.mcpList).not.toHaveBeenCalled()
    })
  })

  describe("handleRefresh", () => {
    it("can refresh the servers and clear any busy row", async () => {
      const { mcp, store, servers, presenter } = setup()
      store.setBusyName("docs")
      mcp.mcpList.mockResolvedValue([docs, wiki])

      await presenter.handleRefresh()

      expect(servers.servers).toEqual([docs, wiki])
      expect(store.busyName).toBeNull()
      expect(store.refreshing).toBe(false)
    })

    it("can show the error when a refresh fails", async () => {
      const { mcp, store, presenter } = setup()
      mcp.mcpList.mockRejectedValue(new Error("Offline"))

      await presenter.handleRefresh()

      expect(store.error).toBe("Offline")
      expect(store.refreshing).toBe(false)
    })
  })

  describe("handleSignIn", () => {
    it("can sign in to a server and store the list it returns", async () => {
      const { mcp, store, servers, presenter } = setup()
      mcp.mcpSignIn.mockResolvedValue([{ ...docs, state: "connected" }])

      await presenter.handleSignIn("docs")

      expect(mcp.mcpSignIn).toHaveBeenCalledWith("docs")
      expect(servers.servers).toEqual([{ ...docs, state: "connected" }])
      expect(store.busyName).toBeNull()
    })

    it("can show the error when sign-in fails", async () => {
      const { mcp, store, presenter } = setup()
      mcp.mcpSignIn.mockRejectedValue(new Error("Browser closed"))

      await presenter.handleSignIn("docs")

      expect(store.error).toBe("Browser closed")
      expect(store.busyName).toBeNull()
    })
  })

  describe("handleSignOut", () => {
    it("can sign out of a server and store the list it returns", async () => {
      const { mcp, servers, presenter } = setup()
      mcp.mcpSignOut.mockResolvedValue([{ ...docs, state: "needs-auth" }])

      await presenter.handleSignOut("docs")

      expect(mcp.mcpSignOut).toHaveBeenCalledWith("docs")
      expect(servers.servers).toEqual([{ ...docs, state: "needs-auth" }])
    })
  })

  describe("handleSetEnabled", () => {
    it("can disable a server and store the list it returns", async () => {
      const { mcp, servers, presenter } = setup()
      mcp.mcpSetEnabled.mockResolvedValue([{ ...wiki, enabled: false, state: "disabled" }])

      await presenter.handleSetEnabled("wiki", false)

      expect(mcp.mcpSetEnabled).toHaveBeenCalledWith("wiki", false)
      expect(servers.servers).toEqual([{ ...wiki, enabled: false, state: "disabled" }])
    })
  })
})
