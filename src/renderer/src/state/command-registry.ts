import { makeAutoObservable, observableShallow } from "mobx"

export type CommandGroup = "Actions" | "Chats" | "Projects" | "Commands"

export type CommandShortcut = {
  key: string
  // Meta on macOS, Ctrl elsewhere.
  mod?: boolean
  shift?: boolean
  alt?: boolean
}

export type Command = {
  id: string
  label: string
  group: CommandGroup
  shortcut?: CommandShortcut
  enabled?: () => boolean
  // false keeps a keyboard-only command out of the palette. Commands default to listed.
  inPalette?: boolean
  run: () => void
}

// The keyboard fields matchesShortcut reads. A KeyboardEvent satisfies it.
export type ShortcutEvent = Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey">

// A shortcut matches when its key and every modifier agree with the event. A modifier the
// shortcut does not name must be up, so Cmd+Shift+F never runs the Cmd+F command.
export function matchesShortcut(shortcut: CommandShortcut, event: ShortcutEvent): boolean {
  if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
    return false
  }
  // Cmd or Ctrl both count as mod on every platform, as the old keydown handler allowed.
  const mod = event.metaKey || event.ctrlKey
  if (mod !== (shortcut.mod ?? false)) {
    return false
  }
  if (event.shiftKey !== (shortcut.shift ?? false)) {
    return false
  }
  return event.altKey === (shortcut.alt ?? false)
}

export function isCommandEnabled(command: Command): boolean {
  if (command.enabled === undefined) {
    return true
  }
  return command.enabled()
}

// Every command the app can run, in registration order. Features register theirs at boot;
// the palette and the keyboard both read this list.
export class CommandRegistry {
  private items: Command[] = []

  constructor() {
    makeAutoObservable<CommandRegistry, "items">(this, { items: observableShallow })
  }

  get commands(): Command[] {
    return this.items
  }

  // Returns the disposer that removes this registration.
  register(command: Command): () => void {
    this.items = [...this.items, command]
    return () => {
      this.items = this.items.filter((item) => item !== command)
    }
  }

  run(id: string) {
    const command = this.items.find((item) => item.id === id)
    if (command === undefined || !isCommandEnabled(command)) {
      return
    }
    command.run()
  }
}
