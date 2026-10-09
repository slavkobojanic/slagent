import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import { Toaster } from "sonner"
import { BridgeMissing } from "@/components/bridge-missing"
import { TooltipProvider } from "@/components/ui/tooltip"
import { createAppClose } from "@/features/app-close/create"
import { AppCloseStore } from "@/features/app-close/app-close-store/app-close-store"
import { createChanges } from "@/features/changes/create"
import { createComposer } from "@/features/composer/create"
import { createCreateSkill } from "@/features/create-skill/create"
import { createLinkMenu } from "@/features/link-menu/create"
import { createLibrary } from "@/features/library/create"
import { createModels } from "@/features/models/create"
import { createPermissionsWizard } from "@/features/permissions-wizard/create"
import { createPlanOverlay } from "@/features/transcript/plan-overlay/create"
import { createSettings } from "@/features/settings/create"
import { createShell } from "@/features/shell/create"
import { createTerminal } from "@/features/terminal/create"
import { createTranscript } from "@/features/transcript/create"
import { API } from "@/ipc/api"
import { createLog } from "@/log/log"
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
import { LinkStore } from "@/state/link/link-store/link-store"
import { McpStore } from "@/state/mcp/mcp-store/mcp-store"
import { NavLogPresenter } from "@/state/nav-log/nav-log-presenter/nav-log-presenter"
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
  const log = createLog({ window, dev: import.meta.env.DEV })
  const api = API.fromWindow(window, log.child("ipc"))
  if (api === null) {
    log.error("bridge-missing")
    return BridgeMissing
  }

  const libraryStore = new LibraryStore()
  const metaStore = new MetaStore()
  const runStore = new RunStore()
  const mirrorPresenter = new MirrorPresenter(api, libraryStore, metaStore, runStore, log.child("mirror"))

  const layoutStore = new LayoutStore()
  const layoutPresenter = new LayoutPresenter(layoutStore, window, log.child("layout"))
  const overlayStore = new OverlayStore()
  const panelStore = new PanelStore()
  const panelPresenter = new PanelPresenter(panelStore, api, log.child("panel"))
  const themeStore = new ThemeStore()
  const themePresenter = new ThemePresenter(themeStore, window, log.child("theme"))
  const permissionsStore = new PermissionsStore(api.platform)
  const reviewStore = new ReviewStore()
  const reviewPresenter = new ReviewPresenter(reviewStore, log.child("review"))
  const mcpStore = new McpStore()
  const commandRegistry = new CommandRegistry()
  const keyboardPresenter = new KeyboardPresenter(commandRegistry, window, permissionsStore, log.child("keyboard"))
  const linkStore = new LinkStore()
  const linkPresenter = new LinkPresenter(linkStore, window, panelPresenter, api, log.child("link"))
  const LinkMenu = createLinkMenu({ store: linkStore, presenter: linkPresenter })
  const composerPort = new ComposerPort()
  const jumpPort = new JumpPort()
  const navLogPresenter = new NavLogPresenter(libraryStore, panelStore, overlayStore, log.child("nav"))

  const Transcript = createTranscript({
    log: log.child("transcript"),
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
  const CreateSkill = createCreateSkill({ log: log.child("create-skill"), api, runStore, overlayStore })
  const Composer = createComposer({
    log: log.child("composer"),
    api,
    window,
    libraryStore,
    metaStore,
    runStore,
    reviewStore,
    reviewPresenter,
    commandRegistry,
    composerPort,
    onBuiltin: CreateSkill.openBuiltin,
  })
  const Changes = createChanges({
    log: log.child("changes"),
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
    log: log.child("library"),
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
    log: log.child("settings"),
    api,
    metaStore,
    overlayStore,
    themeStore,
    themePresenter,
    mcpStore,
    commandRegistry,
  })
  const Models = createModels({
    log: log.child("models"),
    api,
    metaStore,
    runStore,
    overlayStore,
    commandRegistry,
    composerPort,
  })
  const PermissionsWizard = createPermissionsWizard({ log: log.child("permissions-wizard"), api, window, permissionsStore })
  const PlanOverlay = createPlanOverlay({ api, runStore, panelPresenter, composerPort, log: log.child("plan-overlay") })
  const terminal = createTerminal({
    log: log.child("terminal"),
    api,
    window,
    libraryStore,
    layoutStore,
    layoutPresenter,
    commandRegistry,
    composerPort,
  })
  const TerminalDrawer = terminal.Terminal
  const TerminalBar = terminal.Bar
  const appCloseStore = new AppCloseStore()
  const AppClose = createAppClose({ api, appCloseStore, log: log.child("app-close") })
  const Shell = createShell({
    Library,
    Settings,
    Models,
    Transcript,
    Composer,
    Changes,
    PlanOverlay,
    TerminalDrawer,
    TerminalBar,
    CreateSkill: CreateSkill.CreateSkill,
    log: log.child("shell"),
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

  navLogPresenter.start()
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
          <AppClose />
        </TooltipProvider>
        <Toaster theme={themeStore.resolved} toastOptions={TOAST_OPTIONS} />
        <LinkMenu />
      </>
    )
  })
}
