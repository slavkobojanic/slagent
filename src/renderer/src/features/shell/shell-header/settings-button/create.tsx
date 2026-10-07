import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { McpStore } from "@/state/mcp/mcp-store/mcp-store"
import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"
import { SettingsButton } from "./settings-button"
import { SettingsButtonPresenter } from "./settings-button-presenter/settings-button-presenter"

export function createSettingsButton({ mcpStore, overlayStore }: { mcpStore: McpStore; overlayStore: OverlayStore }): ComponentType {
  const presenter = new SettingsButtonPresenter(overlayStore)

  return observer(function SettingsButtonHost() {
    return <SettingsButton needsAuth={mcpStore.servers.some((server) => server.state === "needs-auth")} onOpen={presenter.open} />
  })
}
