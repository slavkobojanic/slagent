import type { McpServerStatus } from "@shared/types"
import { McpServerRow } from "./mcp-server-row/mcp-server-row"

export type McpServerListProps = {
  servers: McpServerStatus[]
  busyName: string | null
  onSignIn: (name: string) => void
  onSignOut: (name: string) => void
  onSetEnabled: (name: string, enabled: boolean) => void
}

export function McpServerList({ servers, busyName, onSignIn, onSignOut, onSetEnabled }: McpServerListProps) {
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
