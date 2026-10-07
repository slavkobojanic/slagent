import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { Log } from "@/log/log"
import type { McpStore } from "@/state/mcp/mcp-store/mcp-store"
import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"
import { SettingsButton } from "./settings-button"
import { SettingsButtonPresenter } from "./settings-button-presenter/settings-button-presenter"

export function createSettingsButton({
  mcpStore,
  overlayStore,
  log,
}: {
  mcpStore: McpStore
  overlayStore: OverlayStore
  log: Log
}): ComponentType {
  const presenter = new SettingsButtonPresenter(overlayStore, log)

  return observer(function SettingsButtonHost() {
    return <SettingsButton needsAuth={mcpStore.servers.some((server) => server.state === "needs-auth")} onOpen={presenter.open} />
  })
}
