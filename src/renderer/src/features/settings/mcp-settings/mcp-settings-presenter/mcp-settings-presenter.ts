import { reaction } from "mobx"
import type { McpServerStatus } from "@shared/types"
import type { McpSettingsStore } from "@/features/settings/mcp-settings/mcp-settings-store/mcp-settings-store"
import type { McpService } from "@/ipc/mcp-service/mcp-service"
import { errorText } from "@/lib/format"
import type { MetaStore } from "@/mirror/meta-store"
import type { McpStore } from "@/state/mcp-store"
import type { OverlayStore } from "@/state/overlay-store"

// Loads the MCP server list when the dialog opens and when the mirror becomes ready, and
// applies every sign-in, sign-out and enable change to the shared McpStore.
export class McpSettingsPresenter {
  private disposeReady: (() => void) | null = null
  private disposeOpen: (() => void) | null = null

  constructor(
    private readonly store: McpSettingsStore,
    private readonly servers: Pick<McpStore, "setServers">,
    private readonly mcp: Pick<McpService, "mcpList" | "mcpSignIn" | "mcpSignOut" | "mcpSetEnabled">,
    private readonly overlay: Pick<OverlayStore, "settingsOpen">,
    private readonly meta: Pick<MetaStore, "ready">,
  ) {}

  start = () => {
    if (this.disposeReady !== null) {
      return
    }
    this.disposeReady = reaction(
      () => this.meta.ready,
      (ready) => {
        if (ready) {
          void this.loadQuietly()
        }
      },
      { fireImmediately: true },
    )
    this.disposeOpen = reaction(
      () => this.overlay.settingsOpen,
      (open) => {
        if (open) {
          // An error from an earlier visit is stale by now, as the legacy toast would have been.
          this.store.setError(null)
          void this.loadQuietly()
        }
      },
    )
  }

  stop = () => {
    this.disposeReady?.()
    this.disposeOpen?.()
    this.disposeReady = null
    this.disposeOpen = null
  }

  handleRefresh = async () => {
    if (this.store.refreshing) {
      return
    }

    // A refresh reports the real state, so a spinner left by a sign-in still waiting on its browser is dropped.
    this.store.setRefreshing(true)
    this.store.setBusyName(null)
    this.store.setError(null)
    try {
      this.servers.setServers(await this.mcp.mcpList())
    } catch (error) {
      this.store.setError(errorText(error))
    } finally {
      this.store.setRefreshing(false)
    }
  }

  handleSignIn = (name: string) => this.run(name, () => this.mcp.mcpSignIn(name))

  handleSignOut = (name: string) => this.run(name, () => this.mcp.mcpSignOut(name))

  handleSetEnabled = (name: string, enabled: boolean) => this.run(name, () => this.mcp.mcpSetEnabled(name, enabled))

  // Background loads keep the list on screen when they fail. A refresh from the dialog reports its error.
  private loadQuietly = async () => {
    try {
      this.servers.setServers(await this.mcp.mcpList())
    } catch {
      // Keep the list that is already shown.
    }
  }

  private run = async (name: string, action: () => Promise<McpServerStatus[]>) => {
    this.store.setBusyName(name)
    this.store.setError(null)
    try {
      this.servers.setServers(await action())
    } catch (error) {
      this.store.setError(errorText(error))
    } finally {
      this.store.setBusyName(null)
    }
  }
}
