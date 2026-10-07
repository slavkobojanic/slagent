import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import { Toaster } from "sonner"
import { BridgeMissing } from "@/components/bridge-missing"
import { TooltipProvider } from "@/components/ui/tooltip"
import { createChanges } from "@/features/changes/create"
import { createComposer } from "@/features/composer/create"
import { createLibrary } from "@/features/library/create"
import { createModels } from "@/features/models/create"
import { createPermissionsWizard } from "@/features/permissions-wizard/create"
import { createSettings } from "@/features/settings/create"
import { createShell } from "@/features/shell/create"
import { createTranscript } from "@/features/transcript/create"
import { API } from "@/ipc/api"
import { LibraryStore } from "@/mirror/library-store/library-store"
import { MetaStore } from "@/mirror/meta-store/meta-store"
import { MirrorPresenter } from "@/mirror/mirror-presenter/mirror-presenter"
import { RunStore } from "@/mirror/run-store/run-store"
import { ComposerPort } from "@/state/composer-port/composer-port"
import { JumpPort } from "@/state/jump-port/jump-port"
import { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import { KeyboardPresenter } from "@/state/keyboard/keyboard-presenter/keyboard-presenter"
import { LayoutPresenter } from "@/state/layout/layout-presenter/layout-presenter"
import { LayoutStore } from "@/state/layout/layout-store/layout-store"
import { LinkPresenter } from "@/state/link/link-presenter/link-presenter"
import { McpStore } from "@/state/mcp/mcp-store/mcp-store"
import { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"
import { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import { PanelStore } from "@/state/panel/panel-store/panel-store"
import { PermissionsStore } from "@/state/permissions/permissions-store/permissions-store"
import { ReviewPresenter } from "@/state/review/review-presenter/review-presenter"
import { ReviewStore } from "@/state/review/review-store/review-store"
import { ThemePresenter } from "@/state/theme/theme-presenter/theme-presenter"
import { ThemeStore } from "@/state/theme/theme-store/theme-store"

const TOAST_OPTIONS = {
  style: {
    background: "var(--background)",
    color: "var(--foreground)",
    border: "1px solid var(--border)",
  },
}

export function createApp(): ComponentType {
  const api = API.fromWindow(window)
  if (api === null) {
    return BridgeMissing
  }

  const libraryStore = new LibraryStore()
  const metaStore = new MetaStore()
  const runStore = new RunStore()
  const mirrorPresenter = new MirrorPresenter(api, libraryStore, metaStore, runStore)

  const layoutStore = new LayoutStore()
  const layoutPresenter = new LayoutPresenter(layoutStore, window)
  const overlayStore = new OverlayStore()
  const panelStore = new PanelStore()
  const panelPresenter = new PanelPresenter(panelStore, api)
  const themeStore = new ThemeStore()
  const themePresenter = new ThemePresenter(themeStore, window)
  const permissionsStore = new PermissionsStore(api.platform)
  const reviewStore = new ReviewStore()
  const reviewPresenter = new ReviewPresenter(reviewStore)
  const mcpStore = new McpStore()
  const commandRegistry = new CommandRegistry()
  const keyboardPresenter = new KeyboardPresenter(commandRegistry, window, permissionsStore)
  const linkPresenter = new LinkPresenter(window, panelPresenter, api)
  const composerPort = new ComposerPort()
  const jumpPort = new JumpPort()

  const Transcript = createTranscript({
    api,
    window,
    metaStore,
    runStore,
    reviewStore,
    reviewPresenter,
    themeStore,
    overlayStore,
    panelPresenter,
    commandRegistry,
    composerPort,
    jumpPort,
  })
  const Composer = createComposer({
    api,
    window,
    libraryStore,
    metaStore,
    runStore,
    reviewStore,
    reviewPresenter,
    commandRegistry,
    composerPort,
  })
  const Changes = createChanges({
    api,
    window,
    metaStore,
    runStore,
    panelStore,
    panelPresenter,
    layoutStore,
    layoutPresenter,
    reviewStore,
    reviewPresenter,
    themeStore,
    commandRegistry,
  })
  const Library = createLibrary({
    api,
    window,
    libraryStore,
    metaStore,
    runStore,
    layoutStore,
    layoutPresenter,
    overlayStore,
    panelPresenter,
    reviewPresenter,
    commandRegistry,
    composerPort,
    jumpPort,
  })
  const Settings = createSettings({
    api,
    metaStore,
    overlayStore,
    themeStore,
    themePresenter,
    mcpStore,
    commandRegistry,
  })
  const Models = createModels({
    api,
    metaStore,
    runStore,
    overlayStore,
    commandRegistry,
    composerPort,
  })
  const PermissionsWizard = createPermissionsWizard({ api, window, permissionsStore })
  const Shell = createShell({
    Library,
    Settings,
    Models,
    Transcript,
    Composer,
    Changes,
    api,
    libraryStore,
    metaStore,
    runStore,
    layoutStore,
    layoutPresenter,
    panelStore,
    panelPresenter,
    overlayStore,
    permissionsStore,
    mcpStore,
    commandRegistry,
  })

  mirrorPresenter.start()
  layoutPresenter.start()
  keyboardPresenter.start()
  linkPresenter.start()
  themePresenter.start()

  return observer(function AppHost() {
    return (
      <>
        <TooltipProvider>
          <Shell />
          <PermissionsWizard />
        </TooltipProvider>
        <Toaster theme={themeStore.resolved} toastOptions={TOAST_OPTIONS} />
      </>
    )
  })
}
