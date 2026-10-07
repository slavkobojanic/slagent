import { PanelLeft, Settings } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import type { AppMeta, ChatMessage, ChatSummary, ComputerPermissions, LibraryState, ProjectSummary, QueuedMessage, Snapshot, UsageState } from "@shared/types"
import { BashTerminal } from "@/components/bash-terminal"
import { Composer } from "@/components/composer"
import { DeleteChatDialog, RemoveProjectDialog } from "@/components/library-dialogs"
import { ModelDialog } from "@/components/model-dialog"
import { PermissionsWizard } from "@/components/permissions-wizard"
import { SettingsDialog } from "@/components/settings-dialog"
import { modKey, orderedChats, ProjectMenu, Sidebar } from "@/components/sidebar"
import { Transcript } from "@/components/transcript"
import { Button } from "@/components/ui/button"
import { errorText, formatTranscript, looksLikePath, openPath } from "@/lib/format"

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
  const [terminal, setTerminal] = useState("")
  const [terminalStreaming, setTerminalStreaming] = useState(false)
  const [usage, setUsage] = useState<UsageState | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
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
  const streamingRef = useRef(false)
  libraryRef.current = library
  streamingRef.current = streaming

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
        setTerminal(event.terminal)
        setTerminalStreaming(event.terminalStreaming)
        setUsage(event.usage)
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
        setTerminal(snapshot.terminal)
        setTerminalStreaming(snapshot.terminalStreaming)
        setUsage(snapshot.usage)
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

    window.addEventListener("keydown", onKeyDown)
    document.addEventListener("click", onClick)
    return () => {
      off()
      window.removeEventListener("keydown", onKeyDown)
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
  const configured = meta?.openRouter.configured ?? false
  const cwd = meta?.cwd ?? ""
  const modelName = meta?.modelName ?? "Choose model"

  let headerClass = "drag flex h-12 shrink-0 items-center gap-2 border-b border-white/10 pr-3"
  if (platform === "darwin") headerClass += " pl-[80px]"
  else headerClass += " pl-4"

  let placeholder = "Describe a change"
  if (!configured) placeholder = "Connect OpenRouter to start"
  if (!cwd) placeholder = "Choose a folder"
  if (!ready) placeholder = "Starting"
  if (ready && configured && cwd && streaming) placeholder = "Queue a follow-up"

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

  const composerDisabled = !ready || !configured || !meta?.modelId || !cwd
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
            <span className="truncate">{modelName}</span>
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
        <div className="sidebar-slot" data-closed={sidebarOpen ? undefined : true} inert={sidebarOpen ? undefined : true}>
        <Sidebar
          library={library}
          onNewChat={() => void newChat()}
          onChooseFolder={() => void chooseFolder()}
          onOpenProject={(projectId) => void runLibrary(() => window.slagent.openProject(projectId))}
          onOpenChat={(chatId) => void runLibrary(() => window.slagent.openChat(chatId))}
          onPinProject={(projectId, pinned) => void runLibrary(() => window.slagent.pinProject(projectId, pinned))}
          onPinChat={(chatId, pinned) => void runLibrary(() => window.slagent.pinChat(chatId, pinned))}
          onRenameChat={(chatId, title) => void runLibrary(() => window.slagent.renameChat(chatId, title))}
          onDeleteChat={setDeleteChat}
          onCopyTranscript={(chat) => void copyTranscript(chat)}
          onRemoveProject={setRemoveProject}
        />
        </div>
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
              onConnect={() => setSettingsOpen(true)}
              onChoose={() => void chooseFolder()}
            />
          )}
          <Composer
            key={library.openChatId ?? "draft"}
            streaming={streaming}
            disabled={composerDisabled}
            placeholder={placeholder}
            queue={queue}
            usage={usage}
            onCompact={() => window.slagent.compact()}
            onPrompt={(request) => window.slagent.prompt(request)}
            onAbort={() => window.slagent.abort()}
            onQueueMode={(id, mode) => window.slagent.setQueueMode(id, mode)}
            onRemoveQueued={(id) => window.slagent.removeQueued(id)}
          />
          <BashTerminal
            output={terminal}
            streaming={terminalStreaming}
            onClear={() => {
              void window.slagent.clearTerminal()
            }}
          />
        </main>
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

function focusComposer() {
  window.requestAnimationFrame(() => {
    const textarea = document.querySelector<HTMLTextAreaElement>("main form textarea")
    textarea?.focus()
  })
}

export { App }
