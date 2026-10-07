import { EllipsisIcon, PinIcon, SearchIcon, XIcon } from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"
import type { ChatSearchResult, ChatStatus, ChatSummary, LibraryState, ProjectSummary } from "@shared/types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

function Sidebar({
  library,
  onNewChat,
  onChooseFolder,
  onOpenProject,
  onOpenChat,
  onPinProject,
  onPinChat,
  onRenameChat,
  onDeleteChat,
  onCopyTranscript,
  onRemoveProject,
}: {
  library: LibraryState
  onNewChat: () => void
  onChooseFolder: () => void
  onOpenProject: (projectId: string) => void
  onOpenChat: (chatId: string, projectId?: string) => void
  onPinProject: (projectId: string, pinned: boolean) => void
  onPinChat: (chatId: string, pinned: boolean) => void
  onRenameChat: (chatId: string, title: string) => void
  onDeleteChat: (chat: ChatSummary) => void
  onCopyTranscript: (chat: ChatSummary) => void
  onRemoveProject: (project: ProjectSummary) => void
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const skipRenameSave = useRef(false)
  const open = library.projects.find((project) => project.id === library.openProjectId) ?? null
  const pinned = library.projects
    .filter((project) => project.pinned && project.id !== library.openProjectId)
    .sort((left, right) => right.pinnedAt - left.pinnedAt)
  const chats = orderedChats(library.chats)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ChatSearchResult[] | null>(null)

  useEffect(() => {
    if (!query.trim()) {
      setResults(null)
      return
    }
    let stop = false
    const timer = window.setTimeout(() => {
      void window.slagent.searchChats(query).then((next) => {
        if (!stop) setResults(next)
      })
    }, 150)
    return () => {
      stop = true
      window.clearTimeout(timer)
    }
  }, [query])

  function startRename(chat: ChatSummary) {
    setRenamingId(chat.id)
    setDraft(chat.title)
  }

  function saveRename(chatId: string) {
    if (skipRenameSave.current) {
      skipRenameSave.current = false
      return
    }
    const title = draft.trim()
    setRenamingId(null)
    if (!title) return
    onRenameChat(chatId, title)
  }

  function cancelRename() {
    skipRenameSave.current = true
    setRenamingId(null)
  }

  return (
    <aside className="flex h-full min-w-0 flex-col overflow-hidden border-r border-white/10">
      <div className="space-y-2 p-3">
        <Button type="button" variant="outline" className="w-full" title={`New chat (${modKey()}N)`} disabled={!library.openProjectId} onClick={onNewChat}>
          New chat
        </Button>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-white/40" />
          <Input
            id="chat-search"
            value={query}
            placeholder="Search chats"
            aria-label="Search chats"
            className="h-8 pr-7 pl-8 text-sm"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setQuery("")
              if (event.key === "Enter" && results?.[0]) {
                onOpenChat(results[0].chatId, results[0].projectId)
                setQuery("")
              }
            }}
          />
          {query ? (
            <button
              type="button"
              className="absolute top-1/2 right-2 -translate-y-1/2 text-white/40 hover:text-white"
              aria-label="Clear search"
              onClick={() => setQuery("")}
            >
              <XIcon className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>
      <ScrollArea className="min-h-0 w-full min-w-0 flex-1">
        <div className="w-full min-w-0 space-y-4 px-2 pb-4">
          {results !== null ? (
            <SearchResults
              results={results}
              openChatId={library.openChatId}
              onOpen={(result) => {
                onOpenChat(result.chatId, result.projectId)
                setQuery("")
              }}
            />
          ) : open ? (
            <section className="space-y-1">
              <ProjectRow
                project={open}
                active
                onOpen={() => onOpenProject(open.id)}
                onPin={() => onPinProject(open.id, !open.pinned)}
                onRemove={() => onRemoveProject(open)}
              />
              {chats.length === 0 ? <p className="px-2 py-1 text-sm text-white/40">No chats yet</p> : null}
              {chats.map((chat) => (
                <ChatRow
                  key={chat.id}
                  chat={chat}
                  active={chat.id === library.openChatId}
                  renaming={renamingId === chat.id}
                  draft={draft}
                  onDraft={setDraft}
                  onOpen={() => onOpenChat(chat.id)}
                  onPin={() => onPinChat(chat.id, !chat.pinned)}
                  onRename={() => startRename(chat)}
                  onSave={() => saveRename(chat.id)}
                  onCancel={cancelRename}
                  onDelete={() => onDeleteChat(chat)}
                  onCopy={() => onCopyTranscript(chat)}
                />
              ))}
            </section>
          ) : (
            <div className="space-y-2 px-2">
              <p className="text-sm text-white/50">Choose a folder to start a project.</p>
              <Button type="button" variant="outline" className="w-full" onClick={onChooseFolder}>
                Choose folder
              </Button>
            </div>
          )}
          {pinned.length > 0 ? (
            <section className="space-y-1">
              <h2 className="px-2 text-xs font-medium tracking-wide text-white/40 uppercase">Pinned</h2>
              {pinned.map((project) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  active={false}
                  onOpen={() => onOpenProject(project.id)}
                  onPin={() => onPinProject(project.id, false)}
                  onRemove={() => onRemoveProject(project)}
                />
              ))}
            </section>
          ) : null}
        </div>
      </ScrollArea>
    </aside>
  )
}

function ProjectMenu({
  library,
  onOpen,
  onChoose,
}: {
  library: LibraryState
  onOpen: (projectId: string) => void
  onChoose: () => void
}) {
  const projects = [...library.projects].sort((left, right) => right.lastOpenedAt - left.lastOpenedAt)
  const open = library.projects.find((project) => project.id === library.openProjectId)
  let label = "Choose folder"
  if (open) label = open.name

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="no-drag max-w-52 truncate text-sm text-white/80 hover:text-white" title={open?.path}>
          {label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-80 w-72">
        {projects.map((project) => (
          <DropdownMenuItem key={project.id} onSelect={() => onOpen(project.id)}>
            <span className="truncate">{project.name}</span>
            <span className="ml-auto">
              <StatusDot status={projectStatus(project)} />
            </span>
          </DropdownMenuItem>
        ))}
        {projects.length > 0 ? <DropdownMenuSeparator /> : null}
        <DropdownMenuItem onSelect={onChoose}>Choose folder</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ProjectRow({
  project,
  active,
  onOpen,
  onPin,
  onRemove,
}: {
  project: ProjectSummary
  active: boolean
  onOpen: () => void
  onPin: () => void
  onRemove: () => void
}) {
  let pinLabel = "Pin"
  if (project.pinned) pinLabel = "Unpin"
  return (
    <div className={cn("group flex w-full min-w-0 items-center overflow-hidden rounded-md", active && "bg-white/10")}>
      <button type="button" className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm" onClick={onOpen}>
        <StatusDot status={projectStatus(project)} />
        <span className="truncate">{project.name}</span>
        {project.pinned && <PinIcon className="size-3 shrink-0 text-white/40" />}
      </button>
      <RowMenu label={`${project.name} actions`}>
        <DropdownMenuItem onSelect={onPin}>{pinLabel}</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onRemove}>
          Remove project
        </DropdownMenuItem>
      </RowMenu>
    </div>
  )
}

function ChatRow({
  chat,
  active,
  renaming,
  draft,
  onDraft,
  onOpen,
  onPin,
  onRename,
  onSave,
  onCancel,
  onDelete,
  onCopy,
}: {
  chat: ChatSummary
  active: boolean
  renaming: boolean
  draft: string
  onDraft: (value: string) => void
  onOpen: () => void
  onPin: () => void
  onRename: () => void
  onSave: () => void
  onCancel: () => void
  onDelete: () => void
  onCopy: () => void
}) {
  let pinLabel = "Pin"
  if (chat.pinned) pinLabel = "Unpin"
  const [menuOpen, setMenuOpen] = useState(false)
  if (renaming) {
    return (
      <form
        className="px-2"
        onSubmit={(event) => {
          event.preventDefault()
          onSave()
        }}
      >
        <Input
          value={draft}
          autoFocus
          aria-label="Chat name"
          onChange={(event) => onDraft(event.target.value)}
          onBlur={onSave}
          onKeyDown={(event) => {
            if (event.key === "Escape") onCancel()
          }}
        />
      </form>
    )
  }
  return (
    <div
      className={cn("group ml-3 flex min-w-0 items-center overflow-hidden rounded-md", active && "bg-white/10")}
      onContextMenu={(event) => {
        event.preventDefault()
        setMenuOpen(true)
      }}
    >
      <button type="button" className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm" onClick={onOpen}>
        <StatusDot status={chat.status} />
        <span className="truncate">{chat.title}</span>
        {chat.pinned && <PinIcon className="size-3 shrink-0 text-white/40" />}
      </button>
      <RowMenu label={`${chat.title} actions`} open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuItem onSelect={onPin}>{pinLabel}</DropdownMenuItem>
        <DropdownMenuItem onSelect={onRename}>Rename</DropdownMenuItem>
        <DropdownMenuItem onSelect={onCopy}>Copy transcript</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          Delete
        </DropdownMenuItem>
      </RowMenu>
    </div>
  )
}

const STATUS_LABELS: Record<ChatStatus, string> = {
  idle: "",
  running: "Running",
  waiting: "Needs your input",
  unread: "Finished, not read yet",
  error: "Stopped with an error",
}

function projectStatus(project: ProjectSummary): ChatStatus {
  if (project.running) return "running"
  if (project.attention) return "unread"
  return "idle"
}

function StatusDot({ status }: { status: ChatStatus }) {
  let className = "size-1.5 shrink-0 rounded-full bg-transparent"
  if (status === "running") className = "size-1.5 shrink-0 animate-pulse rounded-full bg-white"
  if (status === "waiting") className = "size-1.5 shrink-0 rounded-full bg-amber-400"
  if (status === "unread") className = "size-1.5 shrink-0 rounded-full bg-sky-400"
  if (status === "error") className = "size-1.5 shrink-0 rounded-full bg-[#ff5c5c]"
  const label = STATUS_LABELS[status]
  return <span className={className} title={label || undefined} aria-label={label || undefined} role={label ? "img" : undefined} />
}

function SearchResults({
  results,
  openChatId,
  onOpen,
}: {
  results: ChatSearchResult[]
  openChatId: string | null
  onOpen: (result: ChatSearchResult) => void
}) {
  if (results.length === 0) return <p className="px-2 py-1 text-sm text-white/40">No matching chats</p>
  return (
    <section className="space-y-1">
      {results.map((result) => (
        <button
          key={`${result.projectId}:${result.chatId}`}
          type="button"
          className={cn(
            "block w-full min-w-0 rounded-md px-2 py-1.5 text-left hover:bg-white/5",
            result.chatId === openChatId && "bg-white/10",
          )}
          onClick={() => onOpen(result)}
        >
          <span className="block truncate text-sm">{result.title}</span>
          <span className="block truncate text-xs text-white/40">{result.projectName}</span>
          {result.snippet ? <span className="mt-0.5 line-clamp-2 block text-xs text-white/60">{result.snippet}</span> : null}
        </button>
      ))}
    </section>
  )
}

function RowMenu({
  label,
  children,
  open,
  onOpenChange,
}: {
  label: string
  children: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="mr-1 shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
          aria-label={label}
        >
          <EllipsisIcon className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  )
}

function modKey(): string {
  if (window.slagent.platform === "darwin") return "⌘"
  return "Ctrl+"
}

function orderedChats(chats: ChatSummary[]): ChatSummary[] {
  const pinned = chats.filter((chat) => chat.pinned).sort((left, right) => right.pinnedAt - left.pinnedAt)
  const rest = chats.filter((chat) => !chat.pinned).sort((left, right) => right.updatedAt - left.updatedAt)
  return [...pinned, ...rest]
}

export { modKey, orderedChats, ProjectMenu, Sidebar }
