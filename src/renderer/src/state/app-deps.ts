import type { Services } from "@/ipc/services"
import type { Mirror } from "@/mirror/create-mirror"
import type { CommandRegistry } from "@/state/command-registry"
import type { ComposerPort } from "@/state/composer-port"
import type { JumpPort } from "@/state/jump-port"
import type { KeyboardPresenter } from "@/state/keyboard-presenter"
import type { LayoutPresenter } from "@/state/layout-presenter"
import type { LayoutStore } from "@/state/layout-store"
import type { LinkPresenter } from "@/state/link-presenter"
import type { McpStore } from "@/state/mcp-store"
import type { OverlayStore } from "@/state/overlay-store"
import type { PanelPresenter } from "@/state/panel-presenter"
import type { PanelStore } from "@/state/panel-store"
import type { PermissionsStore } from "@/state/permissions-store"
import type { ReviewPresenter } from "@/state/review-presenter"
import type { ReviewStore } from "@/state/review-store"
import type { ThemePresenter } from "@/state/theme-presenter"
import type { ThemeStore } from "@/state/theme-store"

// Browser globals, passed in so presenters never reach for them directly.
export type AppEnv = { window: Window }

// What every feature create receives.
export type AppDeps = {
  services: Services
  env: AppEnv
  mirror: Pick<Mirror, "library" | "meta" | "run">
  shared: {
    layout: LayoutStore
    layoutPresenter: LayoutPresenter
    overlay: OverlayStore
    panel: PanelStore
    panelPresenter: PanelPresenter
    theme: ThemeStore
    themePresenter: ThemePresenter
    commands: CommandRegistry
    keyboard: KeyboardPresenter
    links: LinkPresenter
    composer: ComposerPort
    jump: JumpPort
    review: ReviewStore
    reviewPresenter: ReviewPresenter
    permissions: PermissionsStore
    mcp: McpStore
  }
}
