import { Settings } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import type { AppMeta, ChatMessage, ComputerPermissions, QueuedMessage, Snapshot } from "@shared/types"
import { BashTerminal } from "@/components/bash-terminal"
import { Composer } from "@/components/composer"
import { ModelDialog } from "@/components/model-dialog"
import { PermissionsWizard } from "@/components/permissions-wizard"
import { SettingsDialog } from "@/components/settings-dialog"
import { Transcript } from "@/components/transcript"
import { Button } from "@/components/ui/button"
import { errorText, folderName, openRouterLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

const emptyStatus = { configured: false, source: null, type: null } as const

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
  const [meta, setMeta] = useState<AppMeta | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [queue, setQueue] = useState<QueuedMessage[]>([])
  const [terminal, setTerminal] = useState("")
  const [terminalStreaming, setTerminalStreaming] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const [permissions, setPermissions] = useState<ComputerPermissions | null>(null)
  const transcriptRevision = useRef(0)
  const metaRevision = useRef(0)
  const permissionsLockedRef = useRef(false)

  useEffect(() => {
    const off = window.slagent.onEvent((event) => {
      if (event.type === "transcript" && event.revision >= transcriptRevision.current) {
        transcriptRevision.current = event.revision
        setMessages(event.messages)
        setStreaming(event.streaming)
        setNotice(event.notice)
        setQueue(event.queue)
        setTerminal(event.terminal)
        setTerminalStreaming(event.terminalStreaming)
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
      if (snapshot.revision >= transcriptRevision.current) {
        transcriptRevision.current = snapshot.revision
        setMessages(snapshot.messages)
        setStreaming(snapshot.streaming)
        setNotice(snapshot.notice)
        setQueue(snapshot.queue)
        setTerminal(snapshot.terminal)
        setTerminalStreaming(snapshot.terminalStreaming)
      }
      if (snapshot.revision >= metaRevision.current) {
        metaRevision.current = snapshot.revision
        setMeta(snapshot.meta)
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) return
      if (event.key !== ",") return
      event.preventDefault()
      if (permissionsLockedRef.current) return
      setSettingsOpen(true)
    }

    function onClick(event: MouseEvent) {
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest("a")
      if (!anchor) return
      const href = anchor.getAttribute("href")
      if (!href) return
      if (!href.startsWith("http://") && !href.startsWith("https://")) return
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
    async function refresh() {
      try {
        const next = await window.slagent.getPermissions()
        if (!stop) setPermissions(next)
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
    const timer = window.setInterval(() => {
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
  if (!ready) placeholder = "Starting"
  if (ready && configured && streaming) placeholder = "Queue a follow-up"

  async function chooseFolder() {
    try {
      await window.slagent.chooseFolder()
    } catch (error) {
      toast.error(errorText(error))
    }
  }

  async function newChat() {
    try {
      await window.slagent.newSession()
    } catch (error) {
      toast.error(errorText(error))
    }
  }

  const composerDisabled = !ready || !configured || !meta?.modelId
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
        <span className="text-sm font-medium tracking-tight">slagent</span>
        <span className="text-white/25">/</span>
        <button
          type="button"
          className="no-drag max-w-52 truncate text-sm text-white/80 hover:text-white"
          title={cwd}
          onClick={() => void chooseFolder()}
        >
          {cwd ? folderName(cwd) : "Choose folder"}
        </button>
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
        <aside className="flex w-60 shrink-0 flex-col gap-6 border-r border-white/10 p-4">
          <Button type="button" variant="outline" disabled={!ready} onClick={() => void newChat()}>
            New chat
          </Button>
          <section className="space-y-2">
            <h2 className="text-xs font-medium tracking-wide text-white/40 uppercase">OpenRouter</h2>
            <p className="flex items-center gap-2 text-sm">
              <span className={cn("size-1.5 rounded-full bg-white/30", configured && "bg-white")} />
              {openRouterLabel(meta?.openRouter ?? emptyStatus)}
            </p>
          </section>
          <section className="min-h-0 space-y-2">
            <h2 className="text-xs font-medium tracking-wide text-white/40 uppercase">Extensions</h2>
            {meta && meta.extensions.length === 0 ? (
              <p className="text-sm text-white/50">None loaded</p>
            ) : null}
            <ul className="space-y-1">
              {meta?.extensions.map((extension) => (
                <li key={extension.id} className="truncate text-sm" title={extension.id}>
                  {extension.name}
                  <span className="ml-2 text-xs text-white/40">{extension.scope}</span>
                </li>
              ))}
            </ul>
            {meta?.extensionErrors.map((item) => (
              <p key={item} className="text-xs text-[#ff5c5c]">
                {item}
              </p>
            ))}
          </section>
          <p className="mt-auto text-xs leading-5 text-white/40">
            Pi loads extensions, skills, and AGENTS.md from this folder.
          </p>
        </aside>
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
            />
          )}
          <Composer
            streaming={streaming}
            disabled={composerDisabled}
            placeholder={placeholder}
            queue={queue}
            onPrompt={(text) => window.slagent.prompt(text)}
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
      />
      <ModelDialog
        open={modelOpen}
        onOpenChange={setModelOpen}
        models={meta?.models ?? []}
        modelId={meta?.modelId ?? null}
        disabled={streaming}
      />
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
