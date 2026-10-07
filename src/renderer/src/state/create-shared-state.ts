import type { Services } from "@/ipc/services"
import type { AppDeps } from "@/state/app-deps"
import { ComposerPort } from "@/state/composer-port"
import { JumpPort } from "@/state/jump-port"
import { CommandRegistry } from "@/state/command-registry"
import { KeyboardPresenter } from "@/state/keyboard-presenter"
import { LayoutPresenter } from "@/state/layout-presenter"
import { LayoutStore } from "@/state/layout-store"
import { LinkPresenter } from "@/state/link-presenter"
import { McpStore } from "@/state/mcp-store"
import { OverlayStore } from "@/state/overlay-store"
import { PanelPresenter } from "@/state/panel-presenter"
import { PanelStore } from "@/state/panel-store"
import { PermissionsStore } from "@/state/permissions-store"
import { ReviewPresenter } from "@/state/review-presenter"
import { ReviewStore } from "@/state/review-store"
import { ThemePresenter } from "@/state/theme-presenter"
import { ThemeStore } from "@/state/theme-store"

// Builds every shared store, presenter and port once, at boot. Nothing is started here.
// The root starts the ones that listen to the DOM.
export function createSharedState(services: Services, window: Window): AppDeps["shared"] {
  const env = { window }

  const layout = new LayoutStore()
  const layoutPresenter = new LayoutPresenter(layout, env)
  const overlay = new OverlayStore()
  const panel = new PanelStore()
  const panelPresenter = new PanelPresenter(panel, services.files)
  const theme = new ThemeStore()
  const themePresenter = new ThemePresenter(theme, env)
  const commands = new CommandRegistry()
  const permissions = new PermissionsStore(services.app.platform)
  const keyboard = new KeyboardPresenter(commands, env, permissions)
  const links = new LinkPresenter(env, panelPresenter, services.app)
  const composer = new ComposerPort()
  const jump = new JumpPort()
  const review = new ReviewStore()
  const reviewPresenter = new ReviewPresenter(review)
  const mcp = new McpStore()

  return {
    layout,
    layoutPresenter,
    overlay,
    panel,
    panelPresenter,
    theme,
    themePresenter,
    commands,
    keyboard,
    links,
    composer,
    jump,
    review,
    reviewPresenter,
    permissions,
    mcp,
  }
}
