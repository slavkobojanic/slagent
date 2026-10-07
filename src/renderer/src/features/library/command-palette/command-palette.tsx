import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command"
import type { PaletteGroup } from "@/features/library/command-palette/palette-items"

export type CommandPaletteProps = {
  open: boolean
  // The text in the search box. The presenter owns it, so the models group can follow it.
  query: string
  groups: PaletteGroup[]
  onOpenChange: (open: boolean) => void
  onQueryChange: (value: string) => void
}

// Cmd+K. Every group is built by the owning create, so this view only lays them out.
export function CommandPalette({ open, query, groups, onOpenChange, onQueryChange }: CommandPaletteProps) {
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Command palette" description="Run an action or jump to a chat">
      <CommandInput placeholder="Type a command or search" value={query} onValueChange={onQueryChange} />
      <CommandList className="max-h-105">
        <CommandEmpty>No results</CommandEmpty>
        {groups.map((group) => (
          <CommandGroup key={group.heading} heading={group.heading}>
            {group.items.map((item) => (
              <CommandItem key={`${group.heading}:${item.id}`} value={item.value} disabled={item.disabled} onSelect={() => item.onSelect()}>
                <span className="truncate">{item.label}</span>
                {item.detail ? <span className="truncate text-xs text-muted-foreground">{item.detail}</span> : null}
                {item.shortcut ? <CommandShortcut>{item.shortcut}</CommandShortcut> : null}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
