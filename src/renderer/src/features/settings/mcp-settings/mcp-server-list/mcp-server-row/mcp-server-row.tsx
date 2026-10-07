import { Loader2, LogIn, LogOut, Power, X } from "lucide-react"
import type { McpServerStatus } from "@shared/types"
import { IconAction } from "./icon-action/icon-action"
import { McpStateBadge } from "./mcp-state-badge/mcp-state-badge"

export type McpServerRowProps = {
  server: McpServerStatus
  busy: boolean
  onSignIn: () => void
  onSignOut: () => void
  onToggle: () => void
}

export function McpServerRow({ server, busy, onSignIn, onSignOut, onToggle }: McpServerRowProps) {
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
