import type { McpServerState } from "@shared/types"
import { cn } from "@/lib/utils"

const MCP_STATE_LABELS: Record<McpServerState, { label: string; className: string }> = {
  connected: { label: "Connected", className: "text-success" },
  "needs-auth": { label: "Reauthenticate", className: "text-warning" },
  error: { label: "Failing", className: "text-destructive" },
  disabled: { label: "Disabled", className: "text-white/40" },
}

export function McpStateBadge({ state }: { state: McpServerState }) {
  const { label, className } = MCP_STATE_LABELS[state]
  return <span className={cn("shrink-0 text-xs", className)}>{label}</span>
}
