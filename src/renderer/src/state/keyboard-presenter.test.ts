import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { CommandRegistry, type Command } from "@/state/command-registry"
import { KeyboardPresenter } from "@/state/keyboard-presenter"
import { PermissionsStore } from "@/state/permissions-store"

function command(id: string, overrides: Partial<Command> = {}): Command {
  return { id, label: id, group: "Actions", run: vi.fn(), ...overrides }
}

function keydown(key: string, modifiers: Partial<KeyboardEventInit> = {}): KeyboardEvent {
  return new KeyboardEvent("keydown", { key, cancelable: true, ...modifiers })
}

describe("KeyboardPresenter", () => {
  let registry: CommandRegistry
  let permissions: PermissionsStore
  let presenter: KeyboardPresenter

  beforeEach(() => {
    registry = new CommandRegistry()
    permissions = new PermissionsStore("darwin")
    permissions.setPermissions({ accessibility: true, screenRecording: true, error: null })
    presenter = new KeyboardPresenter(registry, { window }, permissions)
  })

  afterEach(() => {
    presenter.stop()
  })

  describe("start", () => {
    it("can run the enabled command whose shortcut matches the keydown", () => {
      const run = vi.fn()
      registry.register(command("sidebar", { shortcut: { key: "b", mod: true }, run }))
      presenter.start()

      window.dispatchEvent(keydown("b", { metaKey: true }))

      expect(run).toHaveBeenCalledTimes(1)
    })

    it("can run the first enabled match and skip a disabled one", () => {
      const disabled = vi.fn()
      const enabled = vi.fn()
      registry.register(command("disabled", { shortcut: { key: "l", mod: true }, enabled: () => false, run: disabled }))
      registry.register(command("enabled", { shortcut: { key: "l", mod: true }, run: enabled }))
      presenter.start()

      window.dispatchEvent(keydown("l", { metaKey: true }))

      expect(disabled).not.toHaveBeenCalled()
      expect(enabled).toHaveBeenCalledTimes(1)
    })

    it("can prevent the default action when a command runs", () => {
      registry.register(command("palette", { shortcut: { key: "k", mod: true } }))
      presenter.start()
      const event = keydown("k", { metaKey: true })

      window.dispatchEvent(event)

      expect(event.defaultPrevented).toBe(true)
    })

    it("can leave the event alone when no command matches", () => {
      registry.register(command("palette", { shortcut: { key: "k", mod: true } }))
      presenter.start()
      const event = keydown("j", { metaKey: true })

      window.dispatchEvent(event)

      expect(event.defaultPrevented).toBe(false)
    })

    it("can ignore a keydown that an element already prevented", () => {
      const run = vi.fn()
      registry.register(command("escape", { shortcut: { key: "Escape" }, run }))
      window.addEventListener("keydown", (event) => event.preventDefault(), { once: true })
      presenter.start()

      window.dispatchEvent(keydown("Escape"))

      expect(run).not.toHaveBeenCalled()
    })

    it("can ignore every shortcut while the permissions wizard holds the window", () => {
      const run = vi.fn()
      permissions.setPermissions(null)
      registry.register(command("sidebar", { shortcut: { key: "b", mod: true }, run }))
      presenter.start()

      window.dispatchEvent(keydown("b", { metaKey: true }))

      expect(run).not.toHaveBeenCalled()
    })

    it("can attach only once when started twice", () => {
      const run = vi.fn()
      registry.register(command("sidebar", { shortcut: { key: "b", mod: true }, run }))

      presenter.start()
      presenter.start()
      window.dispatchEvent(keydown("b", { metaKey: true }))

      expect(run).toHaveBeenCalledTimes(1)
    })
  })

  describe("stop", () => {
    it("can stop running commands once stopped", () => {
      const run = vi.fn()
      registry.register(command("sidebar", { shortcut: { key: "b", mod: true }, run }))
      presenter.start()
      presenter.stop()

      window.dispatchEvent(keydown("b", { metaKey: true }))

      expect(run).not.toHaveBeenCalled()
    })
  })
})
