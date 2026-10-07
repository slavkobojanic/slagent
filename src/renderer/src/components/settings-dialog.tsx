import { useEffect, useState, type ReactNode } from "react"
import { Eye, EyeOff, LogIn, LogOut, Loader2, Plug, Power, RefreshCw, Settings2, Sparkles, SquareTerminal, X } from "lucide-react"
import { toast } from "sonner"
import type { CliStatus, McpServerState, McpServerStatus, OpenRouterStatus, Personalisation } from "@shared/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { errorText, openRouterLabel } from "@/lib/format"
import { setThemePreference, type ThemePreference, useThemePreference } from "@/lib/theme"
import { cn } from "@/lib/utils"

const KEYS_URL = "https://openrouter.ai/keys"
const THEMES: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
]

type SettingsTab = "general" | "personalisation" | "mcp" | "cli"

const TABS: { value: SettingsTab; label: string; icon: typeof Plug }[] = [
  { value: "general", label: "General", icon: Settings2 },
  { value: "personalisation", label: "Personalisation", icon: Sparkles },
  { value: "mcp", label: "MCP", icon: Plug },
  { value: "cli", label: "CLI", icon: SquareTerminal },
]

function SettingsDialog({
  open,
  onOpenChange,
  status,
  authFile,
  mcpServers,
  onMcpServers,
  onRefreshMcp,
  personalisation,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  status: OpenRouterStatus
  authFile: string
  mcpServers: McpServerStatus[]
  onMcpServers: (servers: McpServerStatus[]) => void
  onRefreshMcp: () => Promise<McpServerStatus[]>
  personalisation: Personalisation
}) {
  const [tab, setTab] = useState<SettingsTab>("general")
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent genieTo='[data-genie-target="settings"]' className="flex h-1/2 w-1/2 flex-col p-0">
        {/* Radix needs a title in the content; the tab labels say the rest. */}
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <div className="flex min-h-0 flex-1">
          <nav aria-label="Settings sections" className="w-40 shrink-0 space-y-1 border-r border-white/10 p-2">
            {TABS.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-current={tab === item.value ? "page" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm",
                    tab === item.value ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white",
                  )}
                  onClick={() => setTab(item.value)}
                >
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </button>
              )
            })}
          </nav>
          <div className="min-w-0 flex-1 overflow-y-auto p-5 pt-12">
            {tab === "general" ? <GeneralSettings status={status} authFile={authFile} /> : null}
            {tab === "personalisation" ? <PersonalisationSettings value={personalisation} /> : null}
            {tab === "mcp" ? (
              <McpSettings servers={mcpServers} onServers={onMcpServers} onRefresh={onRefreshMcp} />
            ) : null}
            {tab === "cli" ? <CliSettings /> : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function GeneralSettings({ status, authFile }: { status: OpenRouterStatus; authFile: string }) {
  const theme = useThemePreference()
  const [apiKey, setApiKey] = useState("")
  const [visible, setVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  const inputType = visible ? "text" : "password"
  const saveLabel = saving ? "Saving" : "Save key"
  const visibilityLabel = visible ? "Hide key" : "Show key"
  const canRemove = status.configured && status.source !== "OPENROUTER_API_KEY"
  let removeLabel = "Remove saved key"
  if (status.type === "oauth") removeLabel = "Sign out"
  if (removing) removeLabel = "Removing"

  async function save() {
    setSaving(true)
    try {
      await window.slagent.saveOpenRouterKey(apiKey)
      setApiKey("")
      toast.success("OpenRouter key saved")
    } catch (error) {
      toast.error(errorText(error))
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    setRemoving(true)
    try {
      await window.slagent.logoutOpenRouter()
      toast.success("OpenRouter credential removed")
    } catch (error) {
      toast.error(errorText(error))
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-sm font-medium">Theme</h2>
        <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-md border border-white/15 p-0.5">
          {THEMES.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={theme === option.value}
              className={cn(
                "rounded px-3 py-1 text-sm text-white/60 transition-colors hover:text-white",
                theme === option.value && "bg-white/10 text-white",
              )}
              onClick={() => setThemePreference(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>
      <section className="space-y-3 border-t border-white/10 pt-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium">OpenRouter</h2>
          <span className="inline-flex items-center gap-1.5 text-xs text-white/70">
            <span className={cn("size-1.5 rounded-full", status.configured ? "bg-emerald-400" : "bg-white/30")} />
            {openRouterLabel(status)}
          </span>
        </div>
        <p className="text-sm text-white/60">
          Non-Claude models run through OpenRouter, using the account Pi is signed into.
        </p>
        {status.envKey ? (
          <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2.5">
            <p className="text-xs text-white/60">
              <span className="font-mono text-white/80">OPENROUTER_API_KEY</span> is set in your environment, so
              OpenRouter already works. Save a key below only to override it.
            </p>
          </div>
        ) : null}
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="openrouter-key">API key</Label>
            <div className="relative">
              <Input
                id="openrouter-key"
                type={inputType}
                value={apiKey}
                autoComplete="off"
                spellCheck={false}
                placeholder="sk-or-..."
                className="pr-10"
                onChange={(event) => setApiKey(event.target.value)}
              />
              <button
                type="button"
                aria-label={visibilityLabel}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {status.type === "oauth" ? (
              <p className="text-xs text-white/45">Saving a key replaces the OpenRouter sign-in stored for Pi.</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => void window.slagent.openExternal(KEYS_URL)}>
              Create a key
            </Button>
            <Button type="submit" disabled={saving || apiKey.trim().length === 0}>
              {saveLabel}
            </Button>
            {canRemove ? (
              <Button
                type="button"
                variant="ghost"
                className="ml-auto text-white/50 hover:text-red-400"
                disabled={removing}
                onClick={() => void remove()}
              >
                {removeLabel}
              </Button>
            ) : null}
          </div>
        </form>
        <p className="text-xs text-white/35">
          Pi stores credentials at <span className="font-mono break-all text-white/45">{authFile}</span>
        </p>
      </section>
    </div>
  )
}

const DEFAULT = "default"

function triValue(value: string): boolean | null {
  if (value === "yes") return true
  if (value === "no") return false
  return null
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function ChoiceSelect({
  value,
  onValueChange,
  options,
}: {
  value: string | null
  onValueChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <Select value={value ?? DEFAULT} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={DEFAULT}>Default</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function PersonalisationSettings({ value }: { value: Personalisation }) {
  const [draft, setDraft] = useState<Personalisation>(value)
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(value)

  function patch(next: Partial<Personalisation>) {
    setDraft((current) => ({ ...current, ...next }))
  }

  async function save() {
    setSaving(true)
    try {
      await window.slagent.setPersonalisation(draft)
      toast.success("Personalisation saved")
    } catch (error) {
      toast.error(errorText(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="space-y-4 border-t border-white/10 pt-4">
        <div>
          <h2 className="text-sm font-medium">Personalisation</h2>
          <p className="text-xs text-white/50">
            How the agent talks and works, in every chat. Anything left on Default keeps the agent's own behaviour.
            Changes apply from your next message.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tone">
            <ChoiceSelect
              value={draft.tone}
              onValueChange={(tone) => patch({ tone: tone === DEFAULT ? null : (tone as Personalisation["tone"]) })}
              options={[
                { value: "direct", label: "Direct" },
                { value: "friendly", label: "Friendly" },
                { value: "professional", label: "Professional" },
              ]}
            />
          </Field>
          <Field label="Brevity">
            <ChoiceSelect
              value={draft.brevity}
              onValueChange={(brevity) => patch({ brevity: brevity === DEFAULT ? null : (brevity as Personalisation["brevity"]) })}
              options={[
                { value: "terse", label: "Terse" },
                { value: "balanced", label: "Balanced" },
                { value: "detailed", label: "Detailed" },
              ]}
            />
          </Field>
          <Field label="Explanations">
            <ChoiceSelect
              value={draft.explanation}
              onValueChange={(explanation) =>
                patch({ explanation: explanation === DEFAULT ? null : (explanation as Personalisation["explanation"]) })
              }
              options={[
                { value: "minimal", label: "Minimal — just do it" },
                { value: "normal", label: "Normal" },
                { value: "educational", label: "Educational — explain choices" },
              ]}
            />
          </Field>
          <Field label="Emoji">
            <ChoiceSelect
              value={tri(draft.emoji)}
              onValueChange={(emoji) => patch({ emoji: emoji === DEFAULT ? null : emoji === "yes" })}
              options={[
                { value: "yes", label: "Prefer emoji" },
                { value: "no", label: "No emoji" },
              ]}
            />
          </Field>
          <Field label="Branch names">
            <ChoiceSelect
              value={draft.branchNaming}
              onValueChange={(branchNaming) =>
                patch({ branchNaming: branchNaming === DEFAULT ? null : (branchNaming as Personalisation["branchNaming"]) })
              }
              options={[
                { value: "descriptive", label: "Kebab-case description" },
                { value: "prefix", label: "Type prefix" },
              ]}
            />
          </Field>
          <Field label="Commit messages">
            <ChoiceSelect
              value={draft.commitStyle}
              onValueChange={(commitStyle) =>
                patch({ commitStyle: commitStyle === DEFAULT ? null : (commitStyle as Personalisation["commitStyle"]) })
              }
              options={[
                { value: "conventional", label: "Conventional commits" },
                { value: "imperative", label: "Imperative summary" },
                { value: "free", label: "Keep it simple" },
              ]}
            />
          </Field>
          <Field label="Reply language">
            <Input
              value={draft.language ?? ""}
              placeholder="Auto — match your messages"
              onChange={(event) => patch({ language: event.target.value })}
            />
          </Field>
          {draft.branchNaming === "prefix" ? (
            <Field label="Branch prefix">
              <Input
                value={draft.branchPrefix ?? ""}
                placeholder="feat, fix, ticket-id…"
                spellCheck={false}
                onChange={(event) => patch({ branchPrefix: event.target.value })}
              />
            </Field>
          ) : null}
          <Field label="Before finishing a turn">
            <ChoiceSelect
              value={tri(draft.checkBeforeFinish)}
              onValueChange={(check) => patch({ checkBeforeFinish: triValue(check) })}
              options={[
                { value: "yes", label: "Typecheck and test" },
                { value: "no", label: "Just finish" },
              ]}
            />
          </Field>
          <Field label="Committing and pushing">
            <ChoiceSelect
              value={draft.commitStrategy}
              onValueChange={(strategy) =>
                patch({ commitStrategy: strategy === DEFAULT ? null : (strategy as Personalisation["commitStrategy"]) })
              }
              options={[
                { value: "ask", label: "Always ask first" },
                { value: "when-asked", label: "Only when I ask" },
                { value: "at-end", label: "Automatically — one commit at the end" },
                { value: "as-you-go", label: "Automatically — small commits as it goes" },
              ]}
            />
          </Field>
        </div>
        <Field label="Anything else">
          <Textarea
            value={draft.notes ?? ""}
            rows={4}
            placeholder="Extra instructions for the agent — conventions, pet peeves, context it should always have…"
            onChange={(event) => patch({ notes: event.target.value })}
          />
        </Field>
        <div className="flex items-center gap-2">
          <Button type="button" disabled={!dirty || saving} onClick={() => void save()}>
            {saving ? "Saving" : "Save"}
          </Button>
          {dirty ? <span className="text-xs text-white/40">Unsaved changes</span> : null}
        </div>
      </section>
    </div>
  )
}

function tri(value: boolean | null): string | null {
  if (value === true) return "yes"
  if (value === false) return "no"
  return null
}

function McpSettings({
  servers,
  onServers,
  onRefresh,
}: {
  servers: McpServerStatus[]
  onServers: (servers: McpServerStatus[]) => void
  onRefresh: () => Promise<McpServerStatus[]>
}) {
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  async function refresh() {
    setRefreshing(true)
    // A refresh reports the real state, so drop any spinner left over from a
    // sign-in that is still waiting on its browser callback.
    setBusy(null)
    try {
      onServers(await onRefresh())
    } catch (error) {
      toast.error(errorText(error))
    } finally {
      setRefreshing(false)
    }
  }

  async function run(name: string, action: () => Promise<McpServerStatus[]>) {
    setBusy(name)
    try {
      onServers(await action())
    } catch (error) {
      toast.error(errorText(error))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">MCP servers</h2>
          <p className="text-xs text-white/50">Tools these servers offer are available in every chat.</p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={refreshing} onClick={() => void refresh()}>
          {refreshing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Refresh
        </Button>
      </div>
      {servers.length === 0 ? (
        <p className="rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/50">
          No MCP servers are configured yet.
        </p>
      ) : null}
      {servers.length > 0 ? (
        <div className="overflow-hidden rounded-md border border-white/10">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10 text-xs text-white/40">
                <th scope="col" className="w-1/2 px-3 py-2 font-medium">
                  Server
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Status
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {servers.map((server) => (
                <McpServerRow
                  key={server.name}
                  server={server}
                  busy={busy === server.name}
                  onSignIn={() => run(server.name, () => window.slagent.mcpSignIn(server.name))}
                  onSignOut={() => run(server.name, () => window.slagent.mcpSignOut(server.name))}
                  onToggle={() => run(server.name, () => window.slagent.mcpSetEnabled(server.name, !server.enabled))}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <p className="text-xs text-white/35">
        slagent shares Pi&apos;s MCP sign-ins and also loads servers from Pi&apos;s own{" "}
        <span className="font-mono text-white/45">mcp.json</span>.
      </p>
    </div>
  )
}

const CLI_STATE_LABELS: Record<CliStatus["state"], { label: string; dot: string }> = {
  installed: { label: "Installed", dot: "bg-emerald-400" },
  outdated: { label: "Update available", dot: "bg-amber-400" },
  missing: { label: "Not installed", dot: "bg-white/30" },
  conflict: { label: "Path in use", dot: "bg-red-400" },
  unsupported: { label: "macOS only", dot: "bg-white/30" },
}

function CliSettings() {
  const [status, setStatus] = useState<CliStatus | null>(null)
  const [busy, setBusy] = useState<"install" | "uninstall" | null>(null)

  useEffect(() => {
    window.slagent
      .cliStatus()
      .then(setStatus)
      .catch((error) => toast.error(errorText(error)))
  }, [])

  async function run(action: "install" | "uninstall") {
    setBusy(action)
    try {
      const next = action === "install" ? await window.slagent.installCli() : await window.slagent.uninstallCli()
      setStatus(next)
      toast.success(action === "install" ? "slagent command installed" : "slagent command removed")
    } catch (error) {
      toast.error(errorText(error))
    } finally {
      setBusy(null)
    }
  }

  const state = status?.state
  const ours = state === "installed" || state === "outdated"
  let installLabel = "Install command"
  if (state === "outdated") installLabel = "Update command"
  if (busy === "install") installLabel = "Installing"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">Command line</h2>
        {state ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-white/70">
            <span className={cn("size-1.5 rounded-full", CLI_STATE_LABELS[state].dot)} />
            {CLI_STATE_LABELS[state].label}
          </span>
        ) : null}
      </div>
      <p className="text-sm text-white/60">
        Open slagent from a terminal. Pass a folder to open it as a project, or nothing to just bring up the app.
      </p>
      <div className="space-y-1 rounded-md border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-xs text-white/80">
        <div>
          slagent .<span className="text-white/35">{"  "}# open this folder</span>
        </div>
        <div>
          slagent ~/code/app<span className="text-white/35">{"  "}# open another folder</span>
        </div>
        <div>
          slagent<span className="text-white/35">{"  "}# open the app</span>
        </div>
      </div>
      {state === "conflict" ? (
        <p className="text-xs text-red-300/80">
          Another program already has a file at <span className="font-mono">{status?.path}</span>. Remove it to install
          slagent&apos;s command there.
        </p>
      ) : null}
      {state !== "unsupported" ? (
        <div className="flex flex-wrap items-center gap-2">
          {state !== "installed" ? (
            <Button type="button" disabled={!state || state === "conflict" || busy !== null} onClick={() => void run("install")}>
              {busy === "install" ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {installLabel}
            </Button>
          ) : null}
          {ours ? (
            <Button
              type="button"
              variant="ghost"
              className="ml-auto text-white/50 hover:text-red-400"
              disabled={busy !== null}
              onClick={() => void run("uninstall")}
            >
              {busy === "uninstall" ? "Removing" : "Uninstall"}
            </Button>
          ) : null}
        </div>
      ) : null}
      {status ? (
        <p className="text-xs text-white/35">
          Installs to <span className="font-mono text-white/45">{status.path}</span>, which is already on your PATH. macOS
          asks for your password to write there.
        </p>
      ) : null}
    </div>
  )
}

function McpServerRow({
  server,
  busy,
  onSignIn,
  onSignOut,
  onToggle,
}: {
  server: McpServerStatus
  busy: boolean
  onSignIn: () => void
  onSignOut: () => void
  onToggle: () => void
}) {
  return (
    <tr className="transition-colors hover:bg-white/[0.03]">
      <td className="px-3 py-2.5 align-middle">
        <div className="font-mono text-sm text-white">{server.name}</div>
        {server.description ? (
          <div className="mt-0.5 line-clamp-2 text-xs text-white/45">{server.description}</div>
        ) : null}
        {server.state === "error" && server.detail ? (
          <div className="mt-1 text-xs break-words text-red-300/80">{server.detail}</div>
        ) : null}
      </td>
      <td className="px-3 py-2.5 align-middle">
        <div className="flex items-center gap-2">
          <McpStateBadge state={server.state} />
          {busy ? <Loader2 className="size-3.5 shrink-0 animate-spin text-white/50" /> : null}
        </div>
      </td>
      <td className="px-3 py-2.5 align-middle">
        <div className="flex items-center justify-end gap-1">
          {server.state === "needs-auth" && server.oauth ? (
            <IconAction label="Sign in" disabled={busy} onClick={onSignIn}>
              <LogIn className="size-4" />
            </IconAction>
          ) : null}
          {server.state === "connected" && server.oauth ? (
            <IconAction label="Sign out" disabled={busy} onClick={onSignOut}>
              <LogOut className="size-4" />
            </IconAction>
          ) : null}
          <IconAction label={server.enabled ? "Disable" : "Enable"} disabled={busy} onClick={onToggle}>
            {server.enabled ? <X className="size-4" /> : <Power className="size-4" />}
          </IconAction>
        </div>
      </td>
    </tr>
  )
}

function IconAction({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={label}
          disabled={disabled}
          className="text-white/50 hover:text-white"
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

const MCP_STATE_LABELS: Record<McpServerState, { label: string; className: string }> = {
  connected: { label: "Connected", className: "text-emerald-300" },
  "needs-auth": { label: "Reauthenticate", className: "text-amber-300" },
  error: { label: "Failing", className: "text-red-300" },
  disabled: { label: "Disabled", className: "text-white/40" },
}

function McpStateBadge({ state }: { state: McpServerState }) {
  const { label, className } = MCP_STATE_LABELS[state]
  return <span className={cn("shrink-0 text-xs", className)}>{label}</span>
}

export { SettingsDialog }
