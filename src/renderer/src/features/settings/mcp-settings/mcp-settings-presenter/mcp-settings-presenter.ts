import type { McpServerStatus } from "@shared/types"
import type { McpSettingsStore } from "@/features/settings/mcp-settings/mcp-settings-store/mcp-settings-store"
import type { API } from "@/ipc/api"
import { errorText } from "@/lib/format"
import type { Log } from "@/log/log"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { McpStore } from "@/state/mcp/mcp-store/mcp-store"
import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"

export class McpSettingsPresenter {
  private disposeReady: (() => void) | null = null
  private disposeOpen: (() => void) | null = null

  constructor(
    private readonly store: McpSettingsStore,
    private readonly api: API,
    private readonly mcpStore: McpStore,
    private readonly overlayStore: OverlayStore,
    private readonly metaStore: MetaStore,
    private readonly log: Log,
  ) {}

  start = () => {
    if (this.disposeReady !== null) {
      return
    }
    this.disposeReady = this.log.reaction(
      "meta-ready",
      () => this.metaStore.ready,
      (ready) => {
        if (ready) {
          void this.loadQuietly()
        }
      },
      { fireImmediately: true },
    )
    this.disposeOpen = this.log.reaction(
      "settings-open",
      () => this.overlayStore.settingsOpen,
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
    this.log.action("refresh")

    // A refresh reports the real state, so a spinner left by a sign-in still waiting on its browser is dropped.
    this.store.setRefreshing(true)
    this.store.setBusyName(null)
    this.store.setError(null)
    try {
      this.mcpStore.setServers(await this.api.mcpList())
    } catch (error) {
      this.log.warn("refresh-failed", { error })
      this.store.setError(errorText(error))
    } finally {
      this.store.setRefreshing(false)
    }
  }

  handleSignIn = (name: string) => {
    this.log.action("sign-in", { name })
    return this.run(name, () => this.api.mcpSignIn(name))
  }

  handleSignOut = (name: string) => {
    this.log.action("sign-out", { name })
    return this.run(name, () => this.api.mcpSignOut(name))
  }

  handleSetEnabled = (name: string, enabled: boolean) => {
    this.log.action("set-enabled", { name, enabled })
    return this.run(name, () => this.api.mcpSetEnabled(name, enabled))
  }

  // Background loads keep the list on screen when they fail. A refresh from the dialog reports its error.
  private loadQuietly = async () => {
    try {
      this.mcpStore.setServers(await this.api.mcpList())
    } catch {
      // Keep the list that is already shown.
    }
  }

  private run = async (name: string, action: () => Promise<McpServerStatus[]>) => {
    this.store.setBusyName(name)
    this.store.setError(null)
    try {
      this.mcpStore.setServers(await action())
    } catch (error) {
      this.log.warn("server-action-failed", { name, error })
      this.store.setError(errorText(error))
    } finally {
      this.store.setBusyName(null)
    }
  }
}
