import { makeAutoObservable } from "mobx"

export type CommandGroup = "Actions" | "Chats" | "Projects" | "Commands"

export type CommandShortcut = {
  key: string
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
  inPalette?: boolean
  run: () => void
}

export type ShortcutEvent = Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey">

// A modifier the shortcut does not name must be up, so Cmd+Shift+F never runs the Cmd+F command.
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

export class CommandRegistry {
  private items: Command[] = []

  constructor() {
    makeAutoObservable(this)
  }

  get commands(): Command[] {
    return this.items
  }

  register(command: Command): () => void {
    this.items = [...this.items, command]
    return () => {
      this.items = this.items.filter((item) => item.id !== command.id)
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
