import { EllipsisIcon, PinIcon } from "lucide-react"
import { useRef, useState, type ReactNode } from "react"
import type { ChatSummary, LibraryState, ProjectSummary } from "@shared/types"
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
  onOpenChat: (chatId: string) => void
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
    <aside className="flex h-full w-64 min-w-0 flex-col overflow-hidden border-r border-white/10">
      <div className="p-3">
        <Button type="button" variant="outline" className="w-full" title={`New chat (${modKey()}N)`} disabled={!library.openProjectId} onClick={onNewChat}>
          New chat
        </Button>
      </div>
      <ScrollArea className="min-h-0 w-full min-w-0 flex-1">
        <div className="w-full min-w-0 space-y-4 px-2 pb-4">
          {open ? (
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
            {project.running && <span className="ml-auto size-1.5 rounded-full bg-current" />}
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
    <div className={cn("flex w-full min-w-0 items-center overflow-hidden rounded-md", active && "bg-white/10")}>
      <button type="button" className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm" onClick={onOpen}>
        <RunningDot running={project.running} />
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
  const [menuPoint, setMenuPoint] = useState({ x: 0, y: 0 })
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
      className={cn("ml-3 flex min-w-0 items-center overflow-hidden rounded-md", active && "bg-white/10")}
      onContextMenu={(event) => {
        event.preventDefault()
        setMenuPoint({ x: event.clientX, y: event.clientY })
        setMenuOpen(true)
      }}
    >
      <button type="button" className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm" onClick={onOpen}>
        <RunningDot running={chat.running} />
        <span className="truncate">{chat.title}</span>
        {chat.pinned && <PinIcon className="size-3 shrink-0 text-white/40" />}
      </button>
      <RowMenu label={`${chat.title} actions`}>
        <DropdownMenuItem onSelect={onPin}>{pinLabel}</DropdownMenuItem>
        <DropdownMenuItem onSelect={onRename}>Rename</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          Delete
        </DropdownMenuItem>
      </RowMenu>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <span aria-hidden className="pointer-events-none fixed size-px" style={{ left: menuPoint.x, top: menuPoint.y }} />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onCopy}>Copy transcript</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function RunningDot({ running }: { running: boolean }) {
  let className = "size-1.5 shrink-0 rounded-full bg-transparent"
  if (running) className = "size-1.5 shrink-0 rounded-full bg-white"
  return <span className={className} />
}

function RowMenu({ label, children }: { label: string; children: ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon-xs" className="mr-1 shrink-0" aria-label={label}>
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
