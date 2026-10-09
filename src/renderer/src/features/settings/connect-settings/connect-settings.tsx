import { Copy } from "lucide-react"
import type { ServerInfo } from "@shared/types"
import { Button } from "@/components/ui/button"
import type { QrShape } from "@/lib/qr"

export type ConnectSettingsProps = {
  server: ServerInfo | null
  // The connect link as a QR code, when a phone on the tailnet can reach the server.
  qr: QrShape | null
  onCopy: (text: string) => void
}

export function ConnectSettings({ server, qr, onCopy }: ConnectSettingsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">Connect</h2>
        {server?.tailscale ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-white/70">
            <span className="size-1.5 rounded-full bg-success" />
            On your tailnet
          </span>
        ) : null}
      </div>
      <p className="text-sm text-white/60">
        Other windows and devices join this app through one websocket. The address carries a token, so only clients you
        share it with can connect. Reach it from another machine over Tailscale.
      </p>
      <Body server={server} qr={qr} onCopy={onCopy} />
    </div>
  )
}

function Body({ server, qr, onCopy }: ConnectSettingsProps) {
  if (server === null) {
    return <p className="text-sm text-white/60">The server has not started yet. Restart the app and try again.</p>
  }
  return (
    <>
      {qr !== null ? (
        <div className="flex items-center gap-4 rounded-md border border-white/10 bg-white/5 p-3">
          <svg
            role="img"
            aria-label="QR code for the slagent iOS app"
            viewBox={`-4 -4 ${qr.size + 8} ${qr.size + 8}`}
            className="size-36 shrink-0 rounded-sm bg-white"
            shapeRendering="crispEdges"
          >
            <path d={qr.path} className="fill-black" />
          </svg>
          <p className="text-sm text-white/60">
            Scan this with your iPhone's camera to connect the slagent iOS app. The phone needs Tailscale, signed in to
            the same tailnet.
          </p>
        </div>
      ) : (
        <p className="text-sm text-white/60">
          Turn on Tailscale on this Mac to connect a phone. The address updates by itself once it is up.
        </p>
      )}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-xs break-all text-white/80">
          {server.url}
        </div>
        <Button variant="outline" size="sm" onClick={() => onCopy(server.url)}>
          <Copy className="size-3.5" />
          Copy
        </Button>
      </div>
      <p className="text-xs text-white/35">
        Listens on {server.host}, port {server.port}. The same address is saved to slagent-server.json in the app data
        folder.
      </p>
    </>
  )
}
