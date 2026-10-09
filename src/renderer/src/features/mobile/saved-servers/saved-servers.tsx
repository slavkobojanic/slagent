import { X } from "lucide-react"
import type { ServerAddress } from "@/lib/server-address"
import { addressLabel } from "@/lib/server-address"
import { Button } from "@/components/ui/button"

export type SavedServersProps = {
  servers: ServerAddress[]
  // Rendered above the list, and hidden with it when the list is empty.
  heading?: string
  onPick: (address: ServerAddress) => void
  onRemove: (address: ServerAddress) => void
}

// One row per Mac this phone has connected to, newest first.
export function SavedServers({ servers, heading, onPick, onRemove }: SavedServersProps) {
  if (servers.length === 0) {
    return null
  }
  return (
    <div className="space-y-2">
      {heading ? <h3 className="text-sm font-medium">{heading}</h3> : null}
      <ul className="space-y-2">
      {servers.map((address) => (
        <li key={key(address)} className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{addressLabel(address)}</p>
            <p className="truncate font-mono text-xs text-white/50">
              {address.host}:{address.port}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => onPick(address)}>
            Connect
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Forget ${addressLabel(address)}`}
            onClick={() => onRemove(address)}
          >
            <X className="size-4" />
          </Button>
        </li>
      ))}
      </ul>
    </div>
  )
}

function key(address: ServerAddress): string {
  return `${address.host}:${address.port}`
}
