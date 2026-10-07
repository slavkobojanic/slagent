import { observer } from "mobx-react-lite"
import type { McpSettingsPresenter } from "@/features/settings/mcp-settings/mcp-settings-presenter/mcp-settings-presenter"
import type { McpSettingsStore } from "@/features/settings/mcp-settings/mcp-settings-store/mcp-settings-store"
import type { McpStore } from "@/state/mcp/mcp-store/mcp-store"
import { McpServerList } from "./mcp-server-list"

export function createMcpServerList({
  mcpStore,
  mcpSettingsStore,
  mcpSettingsPresenter,
}: {
  mcpStore: McpStore
  mcpSettingsStore: McpSettingsStore
  mcpSettingsPresenter: McpSettingsPresenter
}) {
  return observer(function McpServerListHost() {
    return (
      <McpServerList
        servers={mcpStore.servers}
        busyName={mcpSettingsStore.busyName}
        onSignIn={mcpSettingsPresenter.handleSignIn}
        onSignOut={mcpSettingsPresenter.handleSignOut}
        onSetEnabled={mcpSettingsPresenter.handleSetEnabled}
      />
    )
  })
}
