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
  onPick: (address: ServerAddress) => void
}

// Every Mac on the tailnet that runs slagent, as the connected Mac sees it, so
// the sheet shows the whole fleet — personal and work — with the active one
// marked. Picking another needs no pairing: the tailnet membership is the
// credential.
export function TailnetPeers({ peers, loading, current, onPick }: TailnetPeersProps) {
  if (peers.length === 0 && !loading) {
    return null
  }
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">On your Tailscale network</h3>
      <div className="space-y-2">
        {peers.map((peer) => {
          const active = current !== null && peer.host === current.host && peer.port === current.port
          return (
            <div key={peer.host} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
              <span className={cn("size-2 shrink-0 rounded-full", peer.online ? "bg-success" : "bg-border")} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{peer.name}</p>
                <p className="truncate font-mono text-xs text-white/50">{peer.host}</p>
              </div>
              {active ? (
                <span className="flex shrink-0 items-center gap-1.5 text-xs text-foreground/60">
                  <span className={cn("size-1.5 rounded-full", peer.online ? "bg-success" : "bg-warning")} />
                  Active
                </span>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => onPick({ host: peer.host, port: peer.port, token: "", name: peer.name })}>
                  Connect
                </Button>
              )}
            </div>
          )
        })}
        {loading && peers.length === 0 ? <p className="px-3 py-2 text-xs text-foreground/50">Looking for Macs…</p> : null}
      </div>
    </div>
  )
}
