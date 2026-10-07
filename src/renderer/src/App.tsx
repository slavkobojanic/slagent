import { GitCompareIcon, PanelLeft, Settings } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import type { CSSProperties } from "react"
import type { AppMeta, DiffComment, ReplyComment, FileView, ChatMessage, ChatSummary, ComputerPermissions, LibraryState, McpServerStatus, ProjectSummary, QueuedMessage, QuestionRequest, Snapshot, TaskInfo, TodoItem, UsageState } from "@shared/types"
import { EMPTY_PERSONALISATION } from "@shared/types"
import { CommandPalette, type PaletteAction } from "@/components/command-palette"
import { Composer } from "@/components/composer"
import { RightPanel, type RightTab } from "@/components/right-panel"
import { DeleteChatDialog, RemoveProjectDialog } from "@/components/library-dialogs"
import { ModelDialog } from "@/components/model-dialog"
import { ProviderLogo } from "@/components/provider-logo"
import { PermissionsWizard } from "@/components/permissions-wizard"
import { SettingsDialog } from "@/components/settings-dialog"
import { modKey, orderedChats, ProjectMenu, Sidebar } from "@/components/sidebar"
import { EDIT_LAST_EVENT, Transcript } from "@/components/transcript"
import { Button } from "@/components/ui/button"
import { focusComposer } from "@/lib/composer"
import { useResizableWidth } from "@/lib/resize"
import { errorText, formatTranscript, looksLikePath, openPath, VIEW_FILE_EVENT } from "@/lib/format"

const emptyStatus = { configured: false, source: null, type: null, envKey: false } as const
const emptyLibrary: LibraryState = {
  projects: [],
  openProjectId: null,
  chats: [],
  openChatId: null,
}

type NavEntry = { projectId: string | null; chatId: string | null }

function sameEntry(a: NavEntry, b: NavEntry): boolean {
  return a.projectId === b.projectId && a.chatId === b.chatId
}

function App() {
  if (!window.slagent) {
    return (
      <div className="flex h-full items-center justify-center bg-black p-6 text-sm text-white">
        The app bridge did not load.
      </div>
    )
  }
  return <AgentApp />
}

function AgentApp() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [meta, setMeta] = useState<AppMeta | null>(null)
  const [library, setLibrary] = useState<LibraryState>(emptyLibrary)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  // Where the shown messages sit in the whole chat; the main process sends only a window.
  const [transcriptPage, setTranscriptPage] = useState({ windowStart: 0, hasOlder: false, hasNewer: false })
  // The chat the shown messages belong to; keys the transcript so opening a
  // chat mounts it fresh and lands at the bottom instead of animating there.
  const [transcriptChatId, setTranscriptChatId] = useState<string | null>(null)
  const [streaming, setStreaming] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [queue, setQueue] = useState<QueuedMessage[]>([])
  const [usage, setUsage] = useState<UsageState | null>(null)
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [planMode, setPlanMode] = useState(false)
  const [tasks, setTasks] = useState<TaskInfo[]>([])
  const [planProposal, setPlanProposal] = useState<string | null>(null)
  const [question, setQuestion] = useState<QuestionRequest | null>(null)
  // A search result's message to scroll to once its chat has loaded.
  const [jumpTo, setJumpTo] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mcpServers, setMcpServers] = useState<McpServerStatus[]>([])
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)
  const [installingUpdate, setInstallingUpdate] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelTab, setPanelTab] = useState<RightTab>("changes")
  const [viewedFile, setViewedFile] = useState<FileView | null>(null)
  const changesShown = panelOpen && panelTab === "changes"
  const [diffComments, setDiffComments] = useState<DiffComment[]>([])
  const [replyComments, setReplyComments] = useState<ReplyComment[]>([])
  const sidebarSize = useResizableWidth("slagent:sidebar-width", 256, 200, () => Math.min(480, window.innerWidth * 0.4), 1)
  const diffSize = useResizableWidth("slagent:changes-width", 560, 320, () => window.innerWidth - 520, -1)
  const [permissions, setPermissions] = useState<ComputerPermissions | null>(null)
  const [deleteChat, setDeleteChat] = useState<ChatSummary | null>(null)
  const [removeProject, setRemoveProject] = useState<ProjectSummary | null>(null)
  const transcriptRevision = useRef(0)
  const metaRevision = useRef(0)
  const libraryRevision = useRef(0)
  const openChatRef = useRef<string | null>(null)
  const openProjectRef = useRef<string | null>(null)
  const permissionsLockedRef = useRef(false)
  const libraryRef = useRef<LibraryState>(emptyLibrary)
  const toggleChangesRef = useRef<() => void>(() => undefined)
  const streamingRef = useRef(false)
  libraryRef.current = library
  streamingRef.current = streaming
  const contextRef = useRef({ projectId: library.openProjectId, chatId: library.openChatId, chatIds: new Set<string>() })
  // Chats visited in this window, walked with ⌘[ and ⌘] like browser history.
  const navRef = useRef<{ entries: NavEntry[]; index: number; pending: NavEntry | null }>({ entries: [], index: -1, pending: null })
  const navContextRef = useRef<NavEntry & { chatIds: Set<string> }>({ projectId: null, chatId: null, chatIds: new Set() })

  useEffect(() => {
    const previous = navContextRef.current
    const entry = { projectId: library.openProjectId, chatId: library.openChatId }
    navContextRef.current = { ...entry, chatIds: new Set(library.chats.map((chat) => chat.id)) }
    if (!entry.projectId) return
    if (entry.projectId === previous.projectId && entry.chatId === previous.chatId) return
    const nav = navRef.current
    // While stepping through history, the steps on the way (a project opening
    // before its draft) are not new visits.
    if (nav.pending) {
      if (sameEntry(nav.pending, entry)) nav.pending = null
      return
    }
    const draftBecameChat = entry.projectId === previous.projectId && previous.chatId === null && entry.chatId !== null && !previous.chatIds.has(entry.chatId)
    if (draftBecameChat && nav.index >= 0 && sameEntry(nav.entries[nav.index], previous)) {
      nav.entries[nav.index] = entry
      return
    }
    nav.entries = [...nav.entries.slice(0, nav.index + 1), entry].slice(-100)
    nav.index = nav.entries.length - 1
  }, [library])

  // The side panel, the open file and pending diff comments belong to the chat
  // they were opened in, so they reset when you switch chats or projects. A
  // draft turning into a new chat on its first message keeps them.
  useEffect(() => {
    const previous = contextRef.current
    const projectId = library.openProjectId
    const chatId = library.openChatId
    contextRef.current = { projectId, chatId, chatIds: new Set(library.chats.map((chat) => chat.id)) }
    if (projectId === previous.projectId && chatId === previous.chatId) return
    const draftBecameChat = projectId === previous.projectId && previous.chatId === null && chatId !== null && !previous.chatIds.has(chatId)
    if (draftBecameChat) return
    setPanelOpen(false)
    setPanelTab("changes")
    setViewedFile(null)
    setDiffComments([])
    setReplyComments([])
  }, [library])

  useEffect(() => {
    const off = window.slagent.onUpdateReady(setUpdateVersion)
    void window.slagent.updateStatus().then((version) => {
      if (version) setUpdateVersion(version)
    })
    return off
  }, [])

  useEffect(() => {
    const off = window.slagent.onEvent((event) => {
      if (event.type === "library" && event.revision >= libraryRevision.current) {
        libraryRevision.current = event.revision
        openChatRef.current = event.library.openChatId
        openProjectRef.current = event.library.openProjectId
        setLibrary(event.library)
      }
      if (event.type === "transcript" && event.revision >= transcriptRevision.current) {
        transcriptRevision.current = event.revision
        if (event.chatId !== openChatRef.current || event.projectId !== openProjectRef.current) return
        setMessages(event.messages)
        setTranscriptPage({ windowStart: event.windowStart, hasOlder: event.hasOlder, hasNewer: event.hasNewer })
        setTranscriptChatId(event.chatId)
        setStreaming(event.streaming)
        setNotice(event.notice)
        setQueue(event.queue)
        setUsage(event.usage)
        setTodos(event.todos)
        setPlanMode(event.planMode)
        setTasks(event.tasks)
        setPlanProposal(event.planProposal)
        setQuestion(event.question)
      }
      if (event.type === "meta" && event.revision >= metaRevision.current) {
        metaRevision.current = event.revision
        setMeta(event.meta)
      }
    })

    void window.slagent.getSnapshot().then((snapshot) => {
      applySnapshot(snapshot)
    })

    function applySnapshot(snapshot: Snapshot) {
      if (snapshot.revision >= libraryRevision.current) {
        libraryRevision.current = snapshot.revision
        openChatRef.current = snapshot.library.openChatId
        openProjectRef.current = snapshot.library.openProjectId
        setLibrary(snapshot.library)
      }
      if (snapshot.revision >= transcriptRevision.current) {
        transcriptRevision.current = snapshot.revision
        setMessages(snapshot.messages)
        setTranscriptPage({ windowStart: snapshot.windowStart, hasOlder: snapshot.hasOlder, hasNewer: snapshot.hasNewer })
        setTranscriptChatId(snapshot.library.openChatId)
        setStreaming(snapshot.streaming)
        setNotice(snapshot.notice)
        setQueue(snapshot.queue)
        setUsage(snapshot.usage)
        setTodos(snapshot.todos)
        setPlanMode(snapshot.planMode)
        setTasks(snapshot.tasks)
        setPlanProposal(snapshot.planProposal)
        setQuestion(snapshot.question)
      }
      if (snapshot.revision >= metaRevision.current) {
        metaRevision.current = snapshot.revision
        setMeta(snapshot.meta)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (permissionsLockedRef.current) return
      if (event.key === "Escape" && !event.defaultPrevented && streamingRef.current) {
        if (document.querySelector("[role=dialog], [role=menu]")) return
        event.preventDefault()
        void window.slagent.abort()
        return
      }
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return
      const key = event.key.toLowerCase()
      if (key === "k" && !event.shiftKey) {
        event.preventDefault()
        setPaletteOpen((open) => !open)
        return
      }
      if (key === ",") {
        event.preventDefault()
        setSettingsOpen(true)
        return
      }
      if (key === "n" && !event.shiftKey) {
        event.preventDefault()
        if (libraryRef.current.openProjectId) void window.slagent.newChat().then(focusComposer)
        return
      }
      if (key === "f" && event.shiftKey) {
        event.preventDefault()
        setSidebarOpen(true)
        window.requestAnimationFrame(() => document.getElementById("chat-search")?.focus())
        return
      }
      if (key === "d" && event.shiftKey) {
        event.preventDefault()
        toggleChangesRef.current()
        return
      }
      if (key === "e" && event.shiftKey) {
        if (streamingRef.current) return
        event.preventDefault()
        window.dispatchEvent(new Event(EDIT_LAST_EVENT))
        return
      }
      if (key === "b" && !event.shiftKey) {
        event.preventDefault()
        setSidebarOpen((open) => !open)
        return
      }
      if (key === "l" && !event.shiftKey) {
        event.preventDefault()
        focusComposer()
        return
      }
      if ((event.key === "[" || event.key === "]") && !event.shiftKey) {
        event.preventDefault()
        void navigateHistory(event.key === "[" ? -1 : 1)
        return
      }
      if (/^[1-9]$/.test(event.key) && !event.shiftKey) {
        const chat = orderedChats(libraryRef.current.chats)[Number(event.key) - 1]
        if (!chat) return
        event.preventDefault()
        void window.slagent.openChat(chat.id).then(focusComposer)
      }
    }

    // Steps through visited chats, dropping any that were deleted since.
    async function navigateHistory(direction: -1 | 1) {
      const nav = navRef.current
      let index = nav.index + direction
      while (index >= 0 && index < nav.entries.length) {
        const entry = nav.entries[index]
        const current = { projectId: libraryRef.current.openProjectId, chatId: libraryRef.current.openChatId }
        if (sameEntry(entry, current)) {
          nav.index = index
          index += direction
          continue
        }
        nav.pending = entry
        try {
          if (entry.chatId) {
            await window.slagent.openChat(entry.chatId, entry.projectId ?? undefined)
          } else {
            if (entry.projectId !== libraryRef.current.openProjectId && entry.projectId) await window.slagent.openProject(entry.projectId)
            await window.slagent.newChat()
          }
          nav.index = index
          focusComposer()
          return
        } catch {
          nav.pending = null
          nav.entries.splice(index, 1)
          if (index < nav.index) nav.index -= 1
          if (direction === -1) index -= 1
        }
      }
    }

    function onClick(event: MouseEvent) {
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest("a")
      if (!anchor) {
        const code = target.closest("code")
        if (!code || code.closest("pre") || !code.closest(".chat-transcript")) return
        const text = code.textContent ?? ""
        if (looksLikePath(text)) openPath(text)
        return
      }
      const href = anchor.getAttribute("href")
      if (!href) return
      if (!href.startsWith("http://") && !href.startsWith("https://")) {
        if (!looksLikePath(decodeURIComponent(href))) return
        event.preventDefault()
        openPath(decodeURIComponent(href))
        return
      }
      event.preventDefault()
      void window.slagent.openExternal(href)
    }

    function onViewFile(event: Event) {
      const file = (event as CustomEvent<FileView>).detail
      setViewedFile(file)
      setPanelTab("file")
      setPanelOpen(true)
    }

    window.addEventListener("keydown", onKeyDown)
    window.addEventListener(VIEW_FILE_EVENT, onViewFile)
    document.addEventListener("click", onClick)
    return () => {
      off()
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener(VIEW_FILE_EVENT, onViewFile)
      document.removeEventListener("click", onClick)
    }
  }, [])

  async function refreshMcp(): Promise<McpServerStatus[]> {
    const next = await window.slagent.mcpList()
    setMcpServers(next)
    return next
  }

  useEffect(() => {
    if (!meta?.ready) return
    void refreshMcp().catch(() => undefined)
  }, [meta?.ready])

  useEffect(() => {
    if (settingsOpen) void refreshMcp().catch(() => undefined)
  }, [settingsOpen])

  const platform = window.slagent.platform

  useEffect(() => {
    if (platform !== "darwin") return
    let stop = false
    let timer = 0
    async function refresh() {
      try {
        const next = await window.slagent.getPermissions()
        if (stop) return
        setPermissions(next)
        if (next.accessibility && next.screenRecording) window.clearInterval(timer)
      } catch (error) {
        if (stop) return
        setPermissions({
          accessibility: false,
          screenRecording: false,
          error: errorText(error),
        })
      }
    }
    void refresh()
    timer = window.setInterval(() => {
      void refresh()
    }, 1000)
    return () => {
      stop = true
      window.clearInterval(timer)
    }
  }, [platform])
  const ready = meta?.ready ?? false
  // Claude Code chats sign in through Claude Code itself, so they don't need an OpenRouter key.
  const configured = (meta?.openRouter.configured ?? false) || meta?.modelProvider === "claude-code"
  const cwd = meta?.cwd ?? ""
  const modelName = meta?.modelName ?? "Choose model"

  let headerClass = "drag flex h-12 shrink-0 items-center gap-2 border-b border-white/10 pr-3"
  if (platform === "darwin") headerClass += " pl-[80px]"
  else headerClass += " pl-4"

  let placeholder = "Describe a change"
  if (!configured) placeholder = "Connect OpenRouter to start"
  if (!cwd) placeholder = "Choose a folder"
  if (!ready) placeholder = "Starting"
  if (ready && configured && cwd && planMode) placeholder = "Describe what to plan"
  if (ready && configured && cwd && streaming) placeholder = "Queue a follow-up"
  if (ready && configured && cwd && question) placeholder = "Answer in your own words"

  async function installUpdate() {
    setInstallingUpdate(true)
    try {
      await window.slagent.installUpdate()
    } catch (error) {
      setInstallingUpdate(false)
      toast.error(errorText(error))
    }
  }

  async function chooseFolder() {
    try {
      await window.slagent.chooseFolder()
    } catch (error) {
      toast.error(errorText(error))
    }
  }

  async function copyTranscript(chat: ChatSummary) {
    try {
      const stored = await window.slagent.readTranscript(chat.id)
      const text = formatTranscript(chat.title, stored)
      if (!text) {
        toast.error("This chat is empty.")
        return
      }
      await navigator.clipboard.writeText(text)
      toast.success("Transcript copied")
    } catch (error) {
      toast.error(errorText(error))
    }
  }

  async function newChat(projectId?: string) {
    try {
      if (projectId && projectId !== libraryRef.current.openProjectId) await window.slagent.openProject(projectId)
      await window.slagent.newChat()
    } catch (error) {
      toast.error(errorText(error))
    }
  }

  async function runLibrary(task: () => Promise<void>) {
    try {
      await task()
    } catch (error) {
      toast.error(errorText(error))
    }
  }

  // The changes button and Cmd+Shift+D show the changes tab, or close the
  // panel when it is already showing.
  function toggleChanges() {
    if (changesShown) {
      setPanelOpen(false)
      return
    }
    setPanelTab("changes")
    setPanelOpen(true)
  }
  toggleChangesRef.current = toggleChanges

  const composerDisabled = !ready || !configured || !meta?.modelId || !cwd
  const mod = modKey()
  const paletteActions: PaletteAction[] = [
    { id: "new-chat", label: "New chat", shortcut: `${mod}N`, disabled: !library.openProjectId, run: () => newChat().then(focusComposer) },
    { id: "stop", label: "Stop the run", shortcut: "Esc", disabled: !streaming, run: () => window.slagent.abort() },
    {
      id: "search",
      label: "Search chats",
      shortcut: `${mod}⇧F`,
      run: () => {
        setSidebarOpen(true)
        window.requestAnimationFrame(() => document.getElementById("chat-search")?.focus())
      },
    },
    { id: "sidebar", label: sidebarOpen ? "Hide sidebar" : "Show sidebar", shortcut: `${mod}B`, run: () => setSidebarOpen((open) => !open) },
    {
      id: "edit-last",
      label: "Edit last message",
      shortcut: `${mod}⇧E`,
      disabled: streaming || transcriptPage.hasNewer || !messages.some((message) => message.role === "user" && message.entryId),
      run: () => {
        window.dispatchEvent(new Event(EDIT_LAST_EVENT))
      },
    },
    {
      id: "plan-mode",
      label: planMode ? "Turn off plan mode" : "Turn on plan mode",
      shortcut: "⇧Tab",
      disabled: streaming || !cwd,
      run: () => window.slagent.setPlanMode(!planMode),
    },
    { id: "changes", label: changesShown ? "Hide changes" : "Show changes and commit", shortcut: `${mod}⇧D`, disabled: !cwd, run: toggleChanges },
    { id: "model", label: "Change model", disabled: !ready || streaming, run: () => setModelOpen(true) },
    { id: "compact", label: "Summarize earlier messages", disabled: !usage || streaming, run: () => window.slagent.compact() },
    { id: "folder", label: "Open folder", run: () => chooseFolder() },
    { id: "settings", label: "Settings", shortcut: `${mod},`, run: () => setSettingsOpen(true) },
  ]
  let permissionsLocked = false
  if (platform === "darwin") {
    if (!permissions) permissionsLocked = true
    else if (!permissions.accessibility || !permissions.screenRecording) permissionsLocked = true
  }
  permissionsLockedRef.current = permissionsLocked

  return (
    <>
    <div className="flex h-full flex-col bg-black text-white" inert={permissionsLocked}>
      <header className={headerClass}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="no-drag"
          aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          title={`${sidebarOpen ? "Hide" : "Show"} sidebar (${modKey()}B)`}
          aria-pressed={sidebarOpen}
          onClick={() => setSidebarOpen((open) => !open)}
        >
          <PanelLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium tracking-tight">slagent</span>
        <span className="text-white/25">/</span>
        <ProjectMenu library={library} onOpen={(projectId) => void runLibrary(() => window.slagent.openProject(projectId))} onChoose={() => void chooseFolder()} />
        <div className="no-drag ml-auto flex items-center gap-1">
          {updateVersion ? (
            <Button
              type="button"
              size="sm"
              className="mr-1 bg-blue-500 text-white hover:bg-blue-500/90"
              title="Restart to install the update"
              disabled={installingUpdate}
              onClick={() => void installUpdate()}
            >
              Update available (v{updateVersion})
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            className="max-w-56"
            disabled={!ready || streaming}
            onClick={() => setModelOpen(true)}
          >
            <ProviderLogo provider={meta?.modelProvider ?? null} />
            <span className="truncate">{modelName}</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={changesShown ? "Hide changes" : "Show changes"}
            aria-pressed={changesShown}
            title={`Changes (${modKey()}⇧D)`}
            disabled={!cwd}
            onClick={toggleChanges}
          >
            <GitCompareIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="Settings"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="size-4" />
            {mcpServers.some((server) => server.state === "needs-auth") ? (
              <span className="absolute right-1 top-1 size-1.5 rounded-full bg-amber-400" />
            ) : null}
          </Button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <div
          className="sidebar-slot"
          data-closed={sidebarOpen ? undefined : true}
          data-resizing={sidebarSize.resizing ? true : undefined}
          inert={sidebarOpen ? undefined : true}
          style={{ "--sidebar-width": `${sidebarSize.width}px` } as CSSProperties}
        >
        <Sidebar
          library={library}
          onNewChat={(projectId) => void newChat(projectId).then(focusComposer)}
          onChooseFolder={() => void chooseFolder()}
          onOpenProject={(projectId) => void runLibrary(() => window.slagent.openProject(projectId))}
          onOpenChat={(chatId, projectId, messageId) => {
            setJumpTo(messageId ?? null)
            void runLibrary(() => window.slagent.openChat(chatId, projectId, messageId ?? undefined))
          }}
          onPinProject={(projectId, pinned) => void runLibrary(() => window.slagent.pinProject(projectId, pinned))}
          onPinChat={(chatId, pinned) => void runLibrary(() => window.slagent.pinChat(chatId, pinned))}
          onRenameChat={(chatId, title) => void runLibrary(() => window.slagent.renameChat(chatId, title))}
          onDeleteChat={setDeleteChat}
          onCopyTranscript={(chat) => void copyTranscript(chat)}
          onRemoveProject={setRemoveProject}
        />
        </div>
        {sidebarOpen ? (
          <div className="relative w-0 shrink-0">
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize sidebar"
              title="Drag to resize, double-click to reset"
              className="resize-handle -left-[5px]"
              onPointerDown={sidebarSize.onPointerDown}
              onDoubleClick={sidebarSize.onDoubleClick}
            />
          </div>
        ) : null}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {meta?.error ? (
            <p className="border-b border-white/10 px-6 py-2 text-sm text-[#ff5c5c]">{meta.error}</p>
          ) : null}
          {!ready ? (
            <div className="flex flex-1 items-center justify-center text-sm text-white/50">Starting</div>
          ) : (
            <Transcript
              key={`transcript-${transcriptChatId ?? "draft"}`}
              messages={messages}
              page={transcriptPage}
              notice={notice}
              configured={configured}
              cwd={cwd}
              streaming={streaming}
              planProposal={planProposal}
              question={question}
              onApprovePlan={() => window.slagent.approvePlan()}
              onConnect={() => setSettingsOpen(true)}
              onChoose={() => void chooseFolder()}
              onEdit={(id, text) => window.slagent.editMessage(id, text)}
              jumpTo={jumpTo}
              onJumped={() => setJumpTo(null)}
              replies={replyComments}
              onReplies={setReplyComments}
            />
          )}
          <Composer
            key={library.openChatId ?? "draft"}
            streaming={streaming}
            disabled={composerDisabled}
            placeholder={placeholder}
            queue={queue}
            usage={usage}
            usageTotals={meta?.usageTotals ?? null}
            todos={todos}
            tasks={tasks}
            planMode={planMode}
            onPlanMode={(enabled) => window.slagent.setPlanMode(enabled)}
            onCompact={() => window.slagent.compact()}
            comments={diffComments}
            onRemoveComment={(id) => setDiffComments((current) => current.filter((comment) => comment.id !== id))}
            replies={replyComments}
            onRemoveReply={(id) => setReplyComments((current) => current.filter((reply) => reply.id !== id))}
            onPrompt={async (request) => {
              // The prompt resolves when the run ends, so the comments are
              // cleared as soon as they are sent and put back if sending fails.
              const sent = request.comments ?? []
              const sentReplies = request.replies ?? []
              const ids = new Set([...sent, ...sentReplies].map((comment) => comment.id))
              setDiffComments((current) => current.filter((comment) => !ids.has(comment.id)))
              setReplyComments((current) => current.filter((reply) => !ids.has(reply.id)))
              try {
                await window.slagent.prompt(request)
              } catch (error) {
                setDiffComments((current) => [...sent, ...current])
                setReplyComments((current) => [...sentReplies, ...current])
                throw error
              }
            }}
            onAbort={() => window.slagent.abort()}
            onQueueMode={(id, mode) => window.slagent.setQueueMode(id, mode)}
            onRemoveQueued={(id) => window.slagent.removeQueued(id)}
          />
        </main>
        {panelOpen && cwd ? (
          <RightPanel
            tab={panelTab}
            file={viewedFile}
            width={diffSize.width}
            streaming={streaming}
            comments={diffComments}
            onTab={setPanelTab}
            onCloseFile={() => {
              setViewedFile(null)
              setPanelTab("changes")
            }}
            onClose={() => setPanelOpen(false)}
            onAddComment={(comment) => setDiffComments((current) => [...current, comment])}
            onRemoveComment={(id) => setDiffComments((current) => current.filter((comment) => comment.id !== id))}
            onResizeStart={diffSize.onPointerDown}
            onResetWidth={diffSize.onDoubleClick}
          />
        ) : null}
      </div>
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        status={meta?.openRouter ?? emptyStatus}
        authFile={`${meta?.agentDir ?? ""}/auth.json`}
        mcpServers={mcpServers}
        onMcpServers={setMcpServers}
        onRefreshMcp={refreshMcp}
        personalisation={meta?.personalisation ?? EMPTY_PERSONALISATION}
      />
      <ModelDialog
        open={modelOpen}
        onOpenChange={setModelOpen}
        models={meta?.models ?? []}
        modelId={meta?.modelId ?? null}
        disabled={!ready}
      />
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        actions={paletteActions}
        library={library}
        meta={meta}
        streaming={streaming}
      />
      <DeleteChatDialog chat={deleteChat} onOpenChange={(open) => { if (!open) setDeleteChat(null) }} />
      <RemoveProjectDialog project={removeProject} onOpenChange={(open) => { if (!open) setRemoveProject(null) }} />
    </div>
    <PermissionsWizard
      open={permissionsLocked}
      permissions={permissions}
      onRequestAccessibility={async () => {
        setPermissions(await window.slagent.requestAccessibility())
      }}
      onRequestScreenRecording={async () => {
        setPermissions(await window.slagent.requestScreenRecording())
      }}
    />
  </>
  )
}

export { App }
