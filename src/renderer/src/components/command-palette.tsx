import { useEffect, useState } from "react"
import { toast } from "sonner"
import type { AppMeta, LibraryState, SlashCommand } from "@shared/types"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"
import { modKey, orderedChats } from "@/components/sidebar"
import { fillComposer } from "@/lib/composer"
import { errorText } from "@/lib/format"

export type PaletteAction = {
  id: string
  label: string
  shortcut?: string
  disabled?: boolean
  run: () => void | Promise<void>
}

function CommandPalette({
  open,
  onOpenChange,
  actions,
  library,
  meta,
  streaming,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  actions: PaletteAction[]
  library: LibraryState
  meta: AppMeta | null
  streaming: boolean
}) {
  const [commands, setCommands] = useState<SlashCommand[]>([])
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (!open) return
    setQuery("")
    let stop = false
    void window.slagent.listCommands().then((next) => {
      if (!stop) setCommands(next)
    })
    return () => {
      stop = true
    }
  }, [open])

  function run(task: () => void | Promise<void>) {
    onOpenChange(false)
    void Promise.resolve()
      .then(task)
      .catch((error: unknown) => toast.error(errorText(error)))
  }

  const chats = orderedChats(library.chats)
  const projects = [...library.projects].sort((left, right) => right.lastOpenedAt - left.lastOpenedAt)
  // Hundreds of models would drown the other groups, so they only show once
  // the query is specific enough.
  const models = query.trim().length >= 2 ? (meta?.models ?? []) : []

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Command palette" description="Run an action or jump to a chat">
      <CommandInput placeholder="Type a command or search" value={query} onValueChange={setQuery} />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>No results</CommandEmpty>
        <CommandGroup heading="Actions">
          {actions.map((action) => (
            <CommandItem key={action.id} value={`action ${action.label}`} disabled={action.disabled} onSelect={() => run(action.run)}>
              {action.label}
              {action.shortcut ? <CommandShortcut>{action.shortcut}</CommandShortcut> : null}
            </CommandItem>
          ))}
        </CommandGroup>
        {chats.length > 0 ? (
          <CommandGroup heading="Chats">
            {chats.map((chat, index) => (
              <CommandItem key={chat.id} value={`chat ${chat.id} ${chat.title}`} onSelect={() => run(() => window.slagent.openChat(chat.id))}>
                <span className="truncate">{chat.title}</span>
                {index < 9 ? <CommandShortcut>{`${modKey()}${index + 1}`}</CommandShortcut> : null}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {commands.length > 0 ? (
          <CommandGroup heading="Skills and commands">
            {commands.map((command) => (
              <CommandItem key={command.insert} value={`command ${command.insert} ${command.description}`} onSelect={() => run(() => fillComposer(`${command.insert} `))}>
                <span className="shrink-0">{command.insert}</span>
                <span className="truncate text-xs text-muted-foreground">{command.description}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {projects.length > 0 ? (
          <CommandGroup heading="Projects">
            {projects.map((project) => (
              <CommandItem key={project.id} value={`project ${project.id} ${project.name} ${project.path}`} onSelect={() => run(() => window.slagent.openProject(project.id))}>
                <span className="truncate">{project.name}</span>
                <span className="truncate text-xs text-muted-foreground">{project.path}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {models.length > 0 ? (
          <CommandGroup heading="Models">
            {models.map((model) => (
              <CommandItem
                key={model.id}
                value={`model ${model.id} ${model.name}`}
                disabled={streaming || model.id === meta?.modelId}
                onSelect={() => run(() => window.slagent.setModel(model.id).then(() => undefined))}
              >
                <span className="truncate">{model.name}</span>
                <span className="truncate text-xs text-muted-foreground">{model.id}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>
    </CommandDialog>
  )
}

export { CommandPalette }
