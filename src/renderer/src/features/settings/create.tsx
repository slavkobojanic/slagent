import { observer } from "mobx-react-lite"
import type { ComponentType } from "react"
import type { API } from "@/ipc/api"
import type { Log } from "@/log/log"
import type { MetaStore } from "@/mirror/meta-store/meta-store"
import type { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import type { McpStore } from "@/state/mcp/mcp-store/mcp-store"
import type { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"
import type { ThemePresenter } from "@/state/theme/theme-presenter/theme-presenter"
import type { ThemeStore } from "@/state/theme/theme-store/theme-store"
import { createAbout } from "./about/create"
import { createCliSettings } from "./cli-settings/create"
import { createConnectSettings } from "./connect-settings/create"
import { createMcpSettings } from "./mcp-settings/create"
import { createOpenRouterKey } from "./openrouter-key/create"
import { createPersonalisationSettings } from "./personalisation-settings/create"
import { createProviderRouting } from "./provider-routing/create"
import { createTitleModel } from "./title-model/create"
import { createUsageSettings } from "./usage-settings/create"
import { Settings } from "./settings"
import { SettingsPresenter } from "./settings-presenter/settings-presenter"
import { SettingsStore } from "./settings-store/settings-store"
import { createThemePicker } from "./theme-picker/create"

export function createSettings({
  api,
  metaStore,
  overlayStore,
  themeStore,
  themePresenter,
  mcpStore,
  commandRegistry,
  log,
}: {
  api: API
  metaStore: MetaStore
  overlayStore: OverlayStore
  themeStore: ThemeStore
  themePresenter: ThemePresenter
  mcpStore: McpStore
  commandRegistry: CommandRegistry
  log: Log
}): ComponentType {
  const settingsStore = new SettingsStore()
  const presenter = new SettingsPresenter(settingsStore, overlayStore, commandRegistry, log)

  const ThemePicker = createThemePicker({ themeStore, themePresenter })
  const OpenRouterKey = createOpenRouterKey({ api, metaStore, overlayStore, settingsStore, log: log.child("openrouter-key") })
  const TitleModel = createTitleModel({ api, metaStore, log: log.child("title-model") })
  const ProviderRouting = createProviderRouting({ api, metaStore, log: log.child("provider-routing") })
  const PersonalisationSettings = createPersonalisationSettings({
    api,
    metaStore,
    overlayStore,
    settingsStore,
    log: log.child("personalisation-settings"),
  })
  const McpSettings = createMcpSettings({ api, metaStore, overlayStore, mcpStore, log: log.child("mcp-settings") })
  const CliSettings = createCliSettings({ api, overlayStore, settingsStore, log: log.child("cli-settings") })
  const Usage = createUsageSettings({ api, log: log.child("usage-settings") })
  const About = createAbout({ api, log: log.child("about") })
  const ConnectSettings = createConnectSettings({ api, metaStore, log: log.child("connect-settings") })

  presenter.start()

  return observer(function SettingsHost() {
    return (
      <Settings
        open={overlayStore.settingsOpen}
        tab={settingsStore.tab}
        onTabChange={presenter.handleTabChange}
        onOpenChange={presenter.handleOpenChange}
        ThemePicker={ThemePicker}
        OpenRouterKey={OpenRouterKey}
        TitleModel={TitleModel}
        ProviderRouting={ProviderRouting}
        PersonalisationSettings={PersonalisationSettings}
        McpSettings={McpSettings}
        CliSettings={CliSettings}
        Usage={Usage}
        About={About}
        ConnectSettings={ConnectSettings}
      />
    )
  })
}
