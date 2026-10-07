import { GitCompareIcon, PanelLeft, Settings } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import type { CSSProperties } from "react"
import type { AppMeta, DiffComment, FileView, ChatMessage, ChatSummary, ComputerPermissions, LibraryState, ProjectSummary, QueuedMessage, QuestionRequest, Snapshot, TaskInfo, TodoItem, UsageState } from "@shared/types"
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

const emptyStatus = { configured: false, source: null, type: null } as const
const emptyLibrary: LibraryState = {
  projects: [],
  openProjectId: null,
  chats: [],
  openChatId: null,
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
  const [streaming, setStreaming] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [queue, setQueue] = useState<QueuedMessage[]>([])
  const [usage, setUsage] = useState<UsageState | null>(null)
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [planMode, setPlanMode] = useState(false)
  const [tasks, setTasks] = useState<TaskInfo[]>([])
  const [planProposal, setPlanProposal] = useState<string | null>(null)
  const [question, setQuestion] = useState<QuestionRequest | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelTab, setPanelTab] = useState<RightTab>("changes")
  const [viewedFile, setViewedFile] = useState<FileView | null>(null)
  const changesShown = panelOpen && panelTab === "changes"
  const [diffComments, setDiffComments] = useState<DiffComment[]>([])
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
  }, [library])

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
      if (/^[1-9]$/.test(event.key) && !event.shiftKey) {
        const chat = orderedChats(libraryRef.current.chats)[Number(event.key) - 1]
        if (!chat) return
        event.preventDefault()
        void window.slagent.openChat(chat.id).then(focusComposer)
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

  async function newChat() {
    try {
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
      disabled: streaming || !messages.some((message) => message.role === "user" && message.entryId),
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
            aria-label="OpenRouter settings"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="size-4" />
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
          onNewChat={() => void newChat()}
          onChooseFolder={() => void chooseFolder()}
          onOpenProject={(projectId) => void runLibrary(() => window.slagent.openProject(projectId))}
          onOpenChat={(chatId, projectId) => void runLibrary(() => window.slagent.openChat(chatId, projectId))}
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
              messages={messages}
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
            onPrompt={async (request) => {
              // The prompt resolves when the run ends, so the comments are
              // cleared as soon as they are sent and put back if sending fails.
              const sent = request.comments ?? []
              const ids = new Set(sent.map((comment) => comment.id))
              setDiffComments((current) => current.filter((comment) => !ids.has(comment.id)))
              try {
                await window.slagent.prompt(request)
              } catch (error) {
                setDiffComments((current) => [...sent, ...current])
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
        extensions={meta?.extensions ?? []}
        extensionErrors={meta?.extensionErrors ?? []}
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
