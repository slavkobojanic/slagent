import type { AppEnv } from "@/state/app-deps"
import { CommandRegistry, isCommandEnabled, matchesShortcut } from "@/state/command-registry"
import type { PermissionsStore } from "@/state/permissions-store"

// The one keydown listener. It runs the first enabled command whose shortcut matches.
// Features register commands and never listen for keys themselves.
//
// Two generic rules come from the old App keydown. While the permissions wizard holds
// the screen, no shortcut runs. An event that an element already handled (for example
// Escape closing a menu) is left alone.
export class KeyboardPresenter {
  private attached = false

  constructor(
    private readonly registry: CommandRegistry,
    private readonly env: AppEnv,
    private readonly permissions: Pick<PermissionsStore, "locked">,
  ) {}

  start = () => {
    if (this.attached) {
      return
    }
    this.attached = true
    this.env.window.addEventListener("keydown", this.handleKeyDown)
  }

  stop = () => {
    this.env.window.removeEventListener("keydown", this.handleKeyDown)
    this.attached = false
  }

  private handleKeyDown = (event: KeyboardEvent) => {
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
