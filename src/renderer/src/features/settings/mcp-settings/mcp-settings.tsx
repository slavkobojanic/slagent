import type { ReactNode } from "react"
import { Loader2, LogIn, LogOut, Power, RefreshCw, X } from "lucide-react"
import type { McpServerState, McpServerStatus } from "@shared/types"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export type McpSettingsProps = {
  servers: McpServerStatus[]
  refreshing: boolean
  busyName: string | null
  error: string | null
  onRefresh: () => void
  onSignIn: (name: string) => void
  onSignOut: (name: string) => void
  onSetEnabled: (name: string, enabled: boolean) => void
}

export function McpSettings({ servers, refreshing, busyName, error, onRefresh, onSignIn, onSignOut, onSetEnabled }: McpSettingsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">MCP servers</h2>
          <p className="text-xs text-white/50">Tools these servers offer are available in every chat.</p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={refreshing} onClick={onRefresh}>
          {refreshing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Refresh
        </Button>
      </div>
      {error !== null ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <ServerList servers={servers} busyName={busyName} onSignIn={onSignIn} onSignOut={onSignOut} onSetEnabled={onSetEnabled} />
      <p className="text-xs text-white/35">
        slagent shares Pi&apos;s MCP sign-ins and also loads servers from Pi&apos;s own{" "}
        <span className="font-mono text-white/45">mcp.json</span>.
      </p>
    </div>
  )
}

function ServerList({
  servers,
  busyName,
  onSignIn,
  onSignOut,
  onSetEnabled,
}: {
  servers: McpServerStatus[]
  busyName: string | null
  onSignIn: (name: string) => void
  onSignOut: (name: string) => void
  onSetEnabled: (name: string, enabled: boolean) => void
}) {
  if (servers.length === 0) {
    return (
      <p className="rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/50">
        No MCP servers are configured yet.
      </p>
    )
  }

  return (
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
              busy={busyName === server.name}
              onSignIn={() => onSignIn(server.name)}
              onSignOut={() => onSignOut(server.name)}
              onToggle={() => onSetEnabled(server.name, !server.enabled)}
            />
          ))}
        </tbody>
      </table>
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
    <tr className="transition-colors hover:bg-white/3">
      <td className="px-3 py-2.5 align-middle">
        <div className="font-mono text-sm text-white">{server.name}</div>
        {server.description ? <div className="mt-0.5 line-clamp-2 text-xs text-white/45">{server.description}</div> : null}
        {server.state === "error" && server.detail ? (
          <div className="mt-1 text-xs break-words text-destructive/80">{server.detail}</div>
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
  disabled: boolean
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
  connected: { label: "Connected", className: "text-success" },
  "needs-auth": { label: "Reauthenticate", className: "text-warning" },
  error: { label: "Failing", className: "text-destructive" },
  disabled: { label: "Disabled", className: "text-white/40" },
}

function McpStateBadge({ state }: { state: McpServerState }) {
  const { label, className } = MCP_STATE_LABELS[state]
  return <span className={cn("shrink-0 text-xs", className)}>{label}</span>
}
