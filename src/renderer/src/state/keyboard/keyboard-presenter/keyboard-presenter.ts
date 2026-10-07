import { CommandRegistry, isCommandEnabled, matchesShortcut } from "@/state/keyboard/command-registry/command-registry"
import type { PermissionsStore } from "@/state/permissions/permissions-store/permissions-store"

export class KeyboardPresenter {
  private attached = false

  constructor(
    private readonly registry: CommandRegistry,
    private readonly window: Window,
    private readonly permissions: PermissionsStore,
  ) {}

  start = () => {
    if (this.attached) {
      return
    }
    this.attached = true
    this.window.addEventListener("keydown", this.handleKeyDown)
  }

  stop = () => {
    this.window.removeEventListener("keydown", this.handleKeyDown)
    this.attached = false
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    // defaultPrevented means an element already handled the key, e.g. Escape closing a menu.
    if (this.permissions.locked || event.defaultPrevented) {
      return
    }
    const command = this.registry.commands.find((item) => item.shortcut !== undefined && matchesShortcut(item.shortcut, event) && isCommandEnabled(item))
    if (command === undefined) {
      return
    }
    event.preventDefault()
    command.run()
  }
}
