import { observer } from "mobx-react-lite"
import type { API } from "@/ipc/api"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { McpStore } from "@/state/mcp/mcp-store/mcp-store"
import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"
import { createMcpServerList } from "./mcp-server-list/create"
import { McpSettings } from "./mcp-settings"
import { McpSettingsPresenter } from "./mcp-settings-presenter/mcp-settings-presenter"
import { McpSettingsStore } from "./mcp-settings-store/mcp-settings-store"

export function createMcpSettings({
  api,
  metaStore,
  overlayStore,
  mcpStore,
}: {
  api: API
  metaStore: MetaStore
  overlayStore: OverlayStore
  mcpStore: McpStore
}) {
  const mcpSettingsStore = new McpSettingsStore()
  const mcpSettingsPresenter = new McpSettingsPresenter(mcpSettingsStore, api, mcpStore, overlayStore, metaStore)
  mcpSettingsPresenter.start()

  const McpServerList = createMcpServerList({ mcpStore, mcpSettingsStore, mcpSettingsPresenter })

  return observer(function McpSettingsHost() {
    return (
      <McpSettings
        refreshing={mcpSettingsStore.refreshing}
        error={mcpSettingsStore.error}
        onRefresh={mcpSettingsPresenter.handleRefresh}
        McpServerList={McpServerList}
      />
    )
  })
}
