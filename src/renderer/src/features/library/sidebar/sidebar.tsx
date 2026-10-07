import { SearchIcon, XIcon } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import type { ChatSearchResult, ChatStatus, ProjectSummary } from "@shared/types"
import { ResizeHandle } from "@/components/resize-handle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatRow, type ChatActions, type ChatRowModel } from "@/features/library/sidebar/chat-row"
import { ProjectRow, type ProjectActions } from "@/features/library/sidebar/project-row"
import { cn } from "@/lib/utils"

export type PinnedProject = { project: ProjectSummary; status: ChatStatus }

export type SidebarProps = {
  // The shell's slot already sets the width. The handle only shows while the sidebar is open.
  open: boolean
  resizing: boolean
  reduceMotion: boolean
  // "⌘" or "Ctrl+", for hints.
  modKey: string
  onResizeStart: (event: PointerEvent) => void
  onResizeReset: () => void
  // Search
  query: string
  results: ChatSearchResult[] | null
  openChatId: string | null
  onQueryChange: (value: string) => void
  onSearchKeyDown: (key: string) => void
  onClearSearch: () => void
  onOpenResult: (result: ChatSearchResult) => void
  // The open project, its chats, and the chat list controls
  project: ProjectSummary | null
  collapsed: boolean
  rows: ChatRowModel[]
  totalChats: number
  hiddenCount: number
  canShowLess: boolean
  draft: string
  chatActions: ChatActions
  projectActions: ProjectActions
  onChooseFolder: () => void
  onShowAll: () => void
  onShowLess: () => void
  // Pinned projects other than the open one
  pinned: PinnedProject[]
}

// Each row's enter and leave motion. With reduced motion the change lands at once.
const ROW_TRANSITION = { duration: 0.22, ease: [0.23, 1, 0.32, 1] as const }
const INSTANT_TRANSITION = { duration: 0 }

// The sidebar is the aside itself, because the shell's slot styles `.sidebar-slot > aside`.
export function Sidebar({
  open,
  resizing,
  reduceMotion,
  modKey,
  onResizeStart,
  onResizeReset,
  query,
  results,
  openChatId,
  onQueryChange,
  onSearchKeyDown,
  onClearSearch,
  onOpenResult,
  project,
  collapsed,
  rows,
  totalChats,
  hiddenCount,
  canShowLess,
  draft,
  chatActions,
  projectActions,
  onChooseFolder,
  onShowAll,
  onShowLess,
  pinned,
}: SidebarProps) {
  return (
    <aside className="relative flex h-full min-w-0 flex-col overflow-hidden border-r border-foreground/10">
      <div className="p-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-foreground/40" />
          <Input
            id="chat-search"
            value={query}
            placeholder="Search chats"
            aria-label="Search chats"
            className="h-8 pr-7 pl-8 text-sm"
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => onSearchKeyDown(event.key)}
          />
          {query ? (
            <button
              type="button"
              className="absolute top-1/2 right-2 -translate-y-1/2 text-foreground/40 hover:text-foreground"
              aria-label="Clear search"
              onClick={() => onClearSearch()}
            >
              <XIcon className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>
      <ScrollArea className="min-h-0 w-full min-w-0 flex-1">
        <div className="w-full min-w-0 space-y-4 px-2 pb-4">
          <SidebarBody
            results={results}
            openChatId={openChatId}
            onOpenResult={onOpenResult}
            project={project}
            collapsed={collapsed}
            rows={rows}
            totalChats={totalChats}
            hiddenCount={hiddenCount}
            canShowLess={canShowLess}
            draft={draft}
            reduceMotion={reduceMotion}
            modKey={modKey}
            chatActions={chatActions}
            projectActions={projectActions}
            onChooseFolder={onChooseFolder}
            onShowAll={onShowAll}
            onShowLess={onShowLess}
          />
          {pinned.length > 0 ? <PinnedSection pinned={pinned} modKey={modKey} projectActions={projectActions} /> : null}
        </div>
      </ScrollArea>
      {open ? <ResizeHandle edge="sidebar" resizing={resizing} onResizeStart={onResizeStart} onResizeReset={onResizeReset} /> : null}
    </aside>
  )
}

type SidebarBodyProps = Pick<
  SidebarProps,
  | "results"
  | "openChatId"
  | "onOpenResult"
  | "project"
  | "collapsed"
  | "rows"
  | "totalChats"
  | "hiddenCount"
  | "canShowLess"
  | "draft"
  | "reduceMotion"
  | "modKey"
  | "chatActions"
  | "projectActions"
  | "onChooseFolder"
  | "onShowAll"
  | "onShowLess"
>

// The main list. Search results replace it while a query is typed. Otherwise it shows the open project, or
// a prompt to choose a folder when none is open.
function SidebarBody({ results, openChatId, onOpenResult, project, onChooseFolder, ...section }: SidebarBodyProps) {
  if (results !== null) {
    return <SearchResults results={results} openChatId={openChatId} onOpen={onOpenResult} />
  }
  if (project === null) {
    return <ChooseFolder onChooseFolder={onChooseFolder} />
  }
  return <ProjectSection {...section} project={project} />
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
  if (results.length === 0) {
    return <p className="px-2 py-1 text-sm text-foreground/40">No matching chats</p>
  }
  return (
    <section className="space-y-1">
      {results.map((result) => (
        <button
          key={`${result.projectId}:${result.chatId}`}
          type="button"
          className={cn("block w-full min-w-0 rounded-md px-2 py-1.5 text-left hover:bg-foreground/5", result.chatId === openChatId && "bg-foreground/10")}
          onClick={() => onOpen(result)}
        >
          <span className="block truncate text-sm">{result.title}</span>
          <span className="block truncate text-xs text-foreground/40">{result.projectName}</span>
          {result.snippet ? <span className="mt-0.5 line-clamp-2 block text-xs text-foreground/60">{result.snippet}</span> : null}
        </button>
      ))}
    </section>
  )
}

function ChooseFolder({ onChooseFolder }: { onChooseFolder: () => void }) {
  return (
    <div className="space-y-2 px-2">
      <p className="text-sm text-foreground/50">Choose a folder to start a project.</p>
      <Button type="button" variant="outline" className="w-full" onClick={() => onChooseFolder()}>
        Choose folder
      </Button>
    </div>
  )
}

function PinnedSection({ pinned, modKey, projectActions }: { pinned: PinnedProject[]; modKey: string; projectActions: ProjectActions }) {
  return (
    <section className="space-y-1">
      <h2 className="px-2 text-xs font-medium text-foreground/40">Pinned</h2>
      {pinned.map(({ project, status }) => (
        <ProjectRow key={project.id} project={project} status={status} active={false} collapsed={false} modKey={modKey} {...projectActions} />
      ))}
    </section>
  )
}

type ProjectSectionProps = Pick<
  SidebarBodyProps,
  "collapsed" | "rows" | "totalChats" | "hiddenCount" | "canShowLess" | "draft" | "reduceMotion" | "modKey" | "chatActions" | "projectActions" | "onShowAll" | "onShowLess"
> & { project: ProjectSummary }

// The open project: its row, then its chats (unless collapsed), then the show-more controls.
function ProjectSection({
  project,
  collapsed,
  rows,
  totalChats,
  hiddenCount,
  canShowLess,
  draft,
  reduceMotion,
  modKey,
  chatActions,
  projectActions,
  onShowAll,
  onShowLess,
}: ProjectSectionProps) {
  return (
    <section className="space-y-1">
      <ProjectRow project={project} status="idle" active collapsed={collapsed} modKey={modKey} {...projectActions} />
      {collapsed ? null : (
        <>
          {totalChats === 0 ? <p className="ml-3 px-2 py-1 text-sm text-foreground/40">No chats yet</p> : null}
          {/* Keyed by project so switching projects mounts the list without replaying the enter animation. */}
          <div key={project.id} className="relative">
            <AnimatePresence initial={false}>
              {rows.map((row) => (
                <motion.div
                  key={row.chat.id}
                  layout="position"
                  className="overflow-hidden pb-1"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={reduceMotion ? INSTANT_TRANSITION : ROW_TRANSITION}
                >
                  <ChatRow {...row} draft={draft} {...chatActions} />
                </motion.div>
              ))}
            </AnimatePresence>
            {hiddenCount > 0 ? <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-background" /> : null}
          </div>
          {hiddenCount > 0 ? (
            <button type="button" className="ml-3 px-2 py-1 text-xs text-foreground/40 transition-colors hover:text-foreground/70" onClick={() => onShowAll()}>
              Show {hiddenCount} more
            </button>
          ) : null}
          {canShowLess ? (
            <button type="button" className="ml-3 px-2 py-1 text-xs text-foreground/40 transition-colors hover:text-foreground/70" onClick={() => onShowLess()}>
              Show less
            </button>
          ) : null}
        </>
      )}
    </section>
  )
}
