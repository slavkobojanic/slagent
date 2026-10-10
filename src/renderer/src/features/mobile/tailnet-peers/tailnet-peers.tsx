import { RefreshCwIcon } from "lucide-react"
import type { TailscalePeer } from "@shared/types"
import type { ServerAddress } from "@/lib/server-address"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type TailnetPeersProps = {
  peers: TailscalePeer[]
  loading: boolean
  // The Mac the phone is connected to right now, marked Active instead of
  // offering a button.
  current: ServerAddress | null
  // Macs already listed under "Switch to another Mac", so they are not offered twice.
  saved: ServerAddress[]
  onPick: (address: ServerAddress) => void
  onRefresh: () => void
}

// Every Mac on the tailnet that runs slagent, as the connected Mac sees it, so
// the sheet shows the whole fleet — personal and work — with the active one
// marked. Picking another needs no pairing: the tailnet membership is the
// credential. Macs the phone has already connected to are left out, and with none
// left the whole section, heading included, is hidden.
export function TailnetPeers({ peers, loading, current, saved, onPick, onRefresh }: TailnetPeersProps) {
  const known = (peer: TailscalePeer) => [...saved, ...(current === null ? [] : [current])].some((address) => address.host === peer.host && address.port === peer.port)
  const fresh = peers.filter((peer) => !known(peer))
  if (fresh.length === 0) {
    return null
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="min-w-0 flex-1 text-sm font-medium">On your Tailscale network</h3>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Refresh" onClick={onRefresh}>
          <RefreshCwIcon className={cn("size-3.5", loading && "animate-spin")} />
        </Button>
      </div>
      <div className="space-y-2">
        {fresh.map((peer) => {
          return (
            <div key={peer.host} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
              <span className={cn("size-2 shrink-0 rounded-full", peer.online ? "bg-success" : "bg-border")} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{peer.name}</p>
                <p className="truncate font-mono text-xs text-white/50">{peer.host}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => onPick({ host: peer.host, port: peer.port, token: "", name: peer.name })}>
                Connect
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
