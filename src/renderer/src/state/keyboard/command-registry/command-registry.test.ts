import { describe, expect, it, vi } from "vitest"
import { CommandRegistry, matchesShortcut, type Command, type ShortcutEvent } from "@/state/keyboard/command-registry/command-registry"

function command(id: string, overrides: Partial<Command> = {}): Command {
  return { id, label: id, group: "Actions", run: vi.fn(), ...overrides }
}

function key(overrides: Partial<ShortcutEvent> & { key: string }): ShortcutEvent {
  return { metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, ...overrides }
}

describe("CommandRegistry", () => {
  describe("register", () => {
    it("can list commands in the order they were registered", () => {
      const registry = new CommandRegistry()

      registry.register(command("first"))
      registry.register(command("second"))

      expect(registry.commands.map((item) => item.id)).toEqual(["first", "second"])
    })

    it("can remove a command when its disposer runs", () => {
      const registry = new CommandRegistry()
      const dispose = registry.register(command("first"))
      registry.register(command("second"))

      dispose()

      expect(registry.commands.map((item) => item.id)).toEqual(["second"])
    })
  })

  describe("run", () => {
    it("can run the command with the given id", () => {
      const registry = new CommandRegistry()
      const run = vi.fn()
      registry.register(command("open", { run }))

      registry.run("open")

      expect(run).toHaveBeenCalledTimes(1)
    })

    it("can do nothing when no command has the given id", () => {
      const registry = new CommandRegistry()
      const run = vi.fn()
      registry.register(command("open", { run }))

      registry.run("missing")

      expect(run).not.toHaveBeenCalled()
    })

    it("can skip a command whose enabled check returns false", () => {
      const registry = new CommandRegistry()
      const run = vi.fn()
      registry.register(command("stop", { run, enabled: () => false }))

      registry.run("stop")

      expect(run).not.toHaveBeenCalled()
    })
  })
})

describe("matchesShortcut", () => {
  it("can match mod to Meta", () => {
    const event = key({ key: "k", metaKey: true })

    expect(matchesShortcut({ key: "k", mod: true }, event)).toBe(true)
  })

  it("can match mod to Ctrl, as the old keydown handler did", () => {
    const event = key({ key: "k", ctrlKey: true })

    expect(matchesShortcut({ key: "k", mod: true }, event)).toBe(true)
  })

  it("can reject a mod shortcut without a modifier", () => {
    const event = key({ key: "k" })

    expect(matchesShortcut({ key: "k", mod: true }, event)).toBe(false)
  })

  it("can require Shift when the shortcut names it", () => {
    const event = key({ key: "F", metaKey: true, shiftKey: true })

    expect(matchesShortcut({ key: "f", mod: true, shift: true }, event)).toBe(true)
  })

  it("can reject Shift when the shortcut does not name it", () => {
    const event = key({ key: "k", metaKey: true, shiftKey: true })

    expect(matchesShortcut({ key: "k", mod: true }, event)).toBe(false)
  })

  it("can reject Alt when the shortcut does not name it", () => {
    const event = key({ key: "k", metaKey: true, altKey: true })

    expect(matchesShortcut({ key: "k", mod: true }, event)).toBe(false)
  })

  it("can compare the key without regard to case", () => {
    const event = key({ key: "Escape" })

    expect(matchesShortcut({ key: "escape" }, event)).toBe(true)
  })
})
