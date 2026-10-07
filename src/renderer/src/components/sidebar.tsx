import { ChevronRightIcon, EllipsisIcon, PinIcon, SearchIcon, SquarePenIcon, XIcon } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useEffect, useRef, useState, type ReactNode } from "react"
import {
  DONE_WINDOW_MS,
  type ChatSearchResult,
  type ChatStatus,
  type ChatSummary,
  type LibraryState,
  type ProjectSummary,
} from "@shared/types"
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
  onNewChat: (projectId?: string) => void
  onChooseFolder: () => void
  onOpenProject: (projectId: string) => void
  onOpenChat: (chatId: string, projectId?: string, messageId?: string | null) => void
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
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [showAll, setShowAll] = useState(false)
  const openCollapsed = open ? collapsed[open.id] === true : false
  const visibleChats = showAll ? chats : chats.slice(0, CHAT_LIMIT)
  const hiddenCount = chats.length - visibleChats.length
  const reduceMotion = useReducedMotion()
  const rowTransition = reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.23, 1, 0.32, 1] as const }

  // Collapse the long list again whenever another project opens.
  useEffect(() => setShowAll(false), [library.openProjectId])

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
      <div className="p-3">
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
                onOpenChat(results[0].chatId, results[0].projectId, results[0].messageId)
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
                onOpenChat(result.chatId, result.projectId, result.messageId)
                setQuery("")
              }}
            />
          ) : open ? (
            <section className="space-y-1">
              <ProjectRow
                project={open}
                active
                collapsed={openCollapsed}
                onToggle={() =>
                  setCollapsed((current) => ({
                    ...current,
                    [open.id]: !openCollapsed,
                  }))
                }
                onOpen={() =>
                  setCollapsed((current) => ({
                    ...current,
                    [open.id]: !openCollapsed,
                  }))
                }
                onNewChat={() => onNewChat(open.id)}
                onPin={() => onPinProject(open.id, !open.pinned)}
                onRemove={() => onRemoveProject(open)}
              />
              {openCollapsed ? null : (
                <>
                  {chats.length === 0 ? <p className="ml-3 px-2 py-1 text-sm text-white/40">No chats yet</p> : null}
                  {/* Keyed by project so switching projects mounts the list without replaying the enter animation. */}
                  <div key={open.id} className="relative">
                    <AnimatePresence initial={false}>
                      {visibleChats.map((chat) => (
                        <motion.div
                          key={chat.id}
                          layout="position"
                          className="overflow-hidden pb-1"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={rowTransition}
                        >
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
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {hiddenCount > 0 ? (
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-background" />
                    ) : null}
                  </div>
                  {hiddenCount > 0 ? (
                    <button
                      type="button"
                      className="ml-3 px-2 py-1 text-xs text-white/40 transition-colors hover:text-white/70"
                      onClick={() => setShowAll(true)}
                    >
                      Show {hiddenCount} more
                    </button>
                  ) : null}
                  {showAll && chats.length > CHAT_LIMIT ? (
                    <button
                      type="button"
                      className="ml-3 px-2 py-1 text-xs text-white/40 transition-colors hover:text-white/70"
                      onClick={() => setShowAll(false)}
                    >
                      Show less
                    </button>
                  ) : null}
                </>
              )}
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
              <h2 className="px-2 text-xs font-medium text-white/40">Pinned</h2>
              {pinned.map((project) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  active={false}
                  onOpen={() => onOpenProject(project.id)}
                  onNewChat={() => onNewChat(project.id)}
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
  collapsed,
  onToggle,
  onOpen,
  onNewChat,
  onPin,
  onRemove,
}: {
  project: ProjectSummary
  active: boolean
  collapsed?: boolean
  onToggle?: () => void
  onOpen: () => void
  onNewChat: () => void
  onPin: () => void
  onRemove: () => void
}) {
  let pinLabel = "Pin"
  if (project.pinned) pinLabel = "Unpin"
  return (
    <div className="group flex w-full min-w-0 items-center overflow-hidden rounded-md">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm"
        aria-expanded={onToggle ? !collapsed : undefined}
        onClick={onToggle ?? onOpen}
      >
        {onToggle ? (
          <ChevronRightIcon className={cn("size-3 shrink-0 text-white/40 transition-transform duration-150", !collapsed && "rotate-90")} />
        ) : (
          <StatusDot status={projectStatus(project)} />
        )}
        <span className={cn("truncate", active ? "font-medium" : "text-white/80")}>{project.name}</span>
        {project.pinned && <PinIcon className="size-3 shrink-0 text-white/40" />}
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="shrink-0 text-white/50 hover:text-white"
        title={`New chat in ${project.name}${active ? ` (${modKey()}N)` : ""}`}
        aria-label={`New chat in ${project.name}`}
        onClick={onNewChat}
      >
        <SquarePenIcon className="size-3.5" />
      </Button>
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
        <StatusDot status={chat.status} finishedAt={chat.finishedAt} />
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
  running: "Working",
  waiting: "Needs your input",
  done: "Finished",
  error: "Stopped with an error",
}

const STATUS_CLASSES: Record<ChatStatus, string> = {
  idle: "bg-white/15",
  running: "animate-pulse bg-white/60",
  waiting: "bg-sky-400",
  done: "bg-emerald-400",
  error: "bg-[#ff5c5c]",
}

function projectStatus(project: ProjectSummary): ChatStatus {
  if (project.running) return "running"
  if (project.attention) return "done"
  return "idle"
}

function StatusDot({ status, finishedAt = null }: { status: ChatStatus; finishedAt?: number | null }) {
  const [, setTick] = useState(0)
  const doneUntil = status === "done" && finishedAt !== null ? finishedAt + DONE_WINDOW_MS : null
  // Re-render when the done window closes so the dot falls back to idle.
  useEffect(() => {
    if (doneUntil === null) return
    const timer = window.setTimeout(() => setTick((tick) => tick + 1), Math.max(0, doneUntil - Date.now()) + 50)
    return () => window.clearTimeout(timer)
  }, [doneUntil])
  let shown = status
  if (doneUntil !== null && Date.now() >= doneUntil) shown = "idle"
  const label = STATUS_LABELS[shown]
  return (
    <span
      className={cn("mx-[3px] size-1.5 shrink-0 rounded-full", STATUS_CLASSES[shown])}
      title={label || undefined}
      aria-label={label || undefined}
      role={label ? "img" : undefined}
    />
  )
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
    // The slot takes no width until the row is hovered, focused or the menu is open; see .row-menu in index.css.
    <div className="row-menu">
      <div>
        <DropdownMenu open={open} onOpenChange={onOpenChange}>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon-xs" className="row-menu-button mr-1" aria-label={label}>
              <EllipsisIcon className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">{children}</DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

const CHAT_LIMIT = 10

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
