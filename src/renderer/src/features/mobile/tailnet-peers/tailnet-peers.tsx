import type { TailscalePeer } from "@shared/types"
import type { ServerAddress } from "@/lib/server-address"
import { Button } from "@/components/ui/button"

export type TailnetPeersProps = {
  peers: TailscalePeer[]
  loading: boolean
  // Macs already in the saved roster are filtered out, so a row is a new machine.
  saved: ServerAddress[]
  onPick: (address: ServerAddress) => void
}

// The tailnet's slagent machines, as the connected Mac sees them, for the
// connection sheet's quick connect. Picking one needs no pairing: the tailnet
// membership is the credential.
export function TailnetPeers({ peers, loading, saved, onPick }: TailnetPeersProps) {
  const candidates = peers.filter((peer) => !saved.some((address) => address.host === peer.host && address.port === peer.port))
  if (candidates.length === 0 && !loading) {
    return null
  }
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">On your Tailscale network</h3>
      <div className="space-y-2">
        {candidates.map((peer) => (
          <div key={peer.host} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
            <span className={`size-2 shrink-0 rounded-full ${peer.online ? "bg-success" : "bg-border"}`} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{peer.name}</p>
              <p className="truncate font-mono text-xs text-white/50">{peer.host}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => onPick({ host: peer.host, port: peer.port, token: "", name: peer.name })}>
              Connect
            </Button>
          </div>
        ))}
        {loading && candidates.length === 0 ? <p className="px-3 py-2 text-xs text-foreground/50">Looking for Macs…</p> : null}
      </div>
    </div>
  )
}
