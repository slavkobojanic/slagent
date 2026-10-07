import type { ComponentType } from "react"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export type McpSettingsProps = {
  refreshing: boolean
  error: string | null
  onRefresh: () => void
  McpServerList: ComponentType
}

export function McpSettings({ refreshing, error, onRefresh, McpServerList }: McpSettingsProps) {
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
      <McpServerList />
      <p className="text-xs text-white/35">
        slagent shares Pi&apos;s MCP sign-ins and also loads servers from Pi&apos;s own{" "}
        <span className="font-mono text-white/45">mcp.json</span>.
      </p>
    </div>
  )
}
