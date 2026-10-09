import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import { Toaster } from "sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { createComposer } from "@/features/composer/create"
import { createCreateSkill } from "@/features/create-skill/create"
import { createLinkMenu } from "@/features/link-menu/create"
import { ConnectPage } from "@/features/mobile/connect-page/connect-page"
import { createConnect } from "@/features/mobile/connect/create"
import { createMobile } from "@/features/mobile/create"
import { createPlanOverlay } from "@/features/transcript/plan-overlay/create"
import { createTranscript } from "@/features/transcript/create"
import { API } from "@/ipc/api"
import type { Device, SavedConnection } from "@/ipc/device"
import { connectRemote } from "@/ipc/remote"
import { createLog } from "@/log/log"
import { LibraryStore } from "@/mirror/library-store/library-store"
import { MetaStore } from "@/mirror/meta-store/meta-store"
import { MirrorPresenter } from "@/mirror/mirror-presenter/mirror-presenter"
import { RunStore } from "@/mirror/run-store/run-store"
import { ComposerPort } from "@/state/composer-port/composer-port"
import { ConnectionPresenter } from "@/state/connection/connection-presenter/connection-presenter"
import { ConnectionStore } from "@/state/connection/connection-store/connection-store"
import { JumpPort } from "@/state/jump-port/jump-port"
import { CommandRegistry } from "@/state/keyboard/command-registry/command-registry"
import { LinkPresenter } from "@/state/link/link-presenter/link-presenter"
import { LinkStore } from "@/state/link/link-store/link-store"
import { OverlayStore } from "@/state/overlay/overlay-store/overlay-store"
import { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import { PanelStore } from "@/state/panel/panel-store/panel-store"
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

// The iOS app's root. It has no preload: with a saved Mac it opens the websocket
// itself and installs window.slagent, then builds the same mirror, transcript and
// composer as the desktop, inside a phone-sized shell. Without one it shows how
// to connect.
export function createMobileApp({ window, device, saved }: { window: Window; device: Device; saved: SavedConnection }): ComponentType {
  const log = createLog({ window, dev: import.meta.env.DEV })
  const themeStore = new ThemeStore()
  const themePresenter = new ThemePresenter(themeStore, window, log.child("theme"))
  themePresenter.start()

  if (saved.address === null) {
    const Connect = createConnect({ device, log: log.child("connect") })
    return function ConnectHost() {
      return <ConnectPage Connect={Connect} />
    }
  }

  const client = connectRemote(window, saved.address, saved.clientId)
  const api = API.fromWindow(window, log.child("ipc"))
  if (api === null) {
    throw new Error("The remote bridge did not install.")
  }
  const connectionStore = new ConnectionStore(saved.address)
  const connectionPresenter = new ConnectionPresenter(connectionStore, client, device, log.child("connection"))

  const libraryStore = new LibraryStore()
  const metaStore = new MetaStore()
  const runStore = new RunStore()
  const mirrorPresenter = new MirrorPresenter(api, libraryStore, metaStore, runStore, log.child("mirror"))

  const overlayStore = new OverlayStore()
  const panelStore = new PanelStore()
  const panelPresenter = new PanelPresenter(panelStore, api, log.child("panel"))
  const reviewStore = new ReviewStore()
  const reviewPresenter = new ReviewPresenter(reviewStore, log.child("review"))
  const commandRegistry = new CommandRegistry()
  const composerPort = new ComposerPort()
  const jumpPort = new JumpPort()
  const linkStore = new LinkStore()
  const linkPresenter = new LinkPresenter(linkStore, window, panelPresenter, api, log.child("link"))
  const LinkMenu = createLinkMenu({ store: linkStore, presenter: linkPresenter })

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
    touch: true,
  })
  const PlanOverlay = createPlanOverlay({ api, runStore, panelPresenter, composerPort, showPlan: true, log: log.child("plan-overlay") })
  const Mobile = createMobile({
    api,
    window,
    device,
    libraryStore,
    metaStore,
    themeStore,
    connectionStore,
    connectionPresenter,
    Transcript,
    Composer,
    PlanOverlay,
    log: log.child("mobile"),
  })

  connectionPresenter.start()
  mirrorPresenter.start()
  linkPresenter.start()

  return observer(function MobileAppHost() {
    return (
      <>
        <TooltipProvider>
          <Mobile />
          <CreateSkill.CreateSkill />
        </TooltipProvider>
        <Toaster theme={themeStore.resolved} position="top-center" toastOptions={TOAST_OPTIONS} />
        <LinkMenu />
      </>
    )
  })
}
