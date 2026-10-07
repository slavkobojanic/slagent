import { observer } from "mobx-react-lite"
import type { AppDeps } from "@/state/app-deps"
import { McpSettings } from "./mcp-settings"
import { McpSettingsPresenter } from "./mcp-settings-presenter/mcp-settings-presenter"
import { McpSettingsStore } from "./mcp-settings-store/mcp-settings-store"

// The server list lives in the shared McpStore, so the header badge and this section read the same list.
export function createMcpSettings({ services, mirror, shared }: AppDeps) {
  const store = new McpSettingsStore()
  const presenter = new McpSettingsPresenter(store, shared.mcp, services.mcp, shared.overlay, mirror.meta)
  presenter.start()

  return observer(function McpSettingsHost() {
    return (
      <McpSettings
        servers={shared.mcp.servers}
        refreshing={store.refreshing}
        busyName={store.busyName}
        error={store.error}
        onRefresh={presenter.handleRefresh}
        onSignIn={presenter.handleSignIn}
        onSignOut={presenter.handleSignOut}
        onSetEnabled={presenter.handleSetEnabled}
      />
    )
  })
}
