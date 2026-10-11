import { Copy } from "lucide-react"
import type { ServerInfo } from "@shared/types"
import { Button } from "@/components/ui/button"
import type { QrShape } from "@/lib/qr"

export type BodyProps = {
  server: ServerInfo | null
  qr: QrShape | null
  onCopy: (text: string) => void
}

export function Body({ server, qr, onCopy }: BodyProps) {
  if (server === null) {
    return <p className="text-sm text-white/60">The server has not started yet. Restart the app and try again.</p>
  }
  return (
    <>
      <div className="overflow-hidden rounded-xl bg-white/3">
        {qr !== null ? (
          <div className="flex items-center gap-5 p-4">
            <svg
              role="img"
              aria-label="QR code for the slagent iOS app"
              viewBox={`-4 -4 ${qr.size + 8} ${qr.size + 8}`}
              className="size-32 shrink-0 rounded-lg bg-white"
              shapeRendering="crispEdges"
            >
              <path d={qr.path} className="fill-black" />
            </svg>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium">Scan with your iPhone</p>
              <p className="text-sm text-white/60">
                Point the camera at the code to connect the slagent iOS app. The phone needs Tailscale, signed in to the
                same tailnet.
              </p>
            </div>
          </div>
        ) : (
          <p className="p-4 text-sm text-white/60">
            Turn on Tailscale on this Mac to connect a phone. The address updates by itself once it is up.
          </p>
        )}
        <div className="flex items-center gap-2 bg-white/3 py-1.5 pr-1.5 pl-4">
          <span title={server.url} className="min-w-0 flex-1 truncate font-mono text-xs text-white/70">
            {server.url}
          </span>
          <Button type="button" variant="ghost" size="xs" onClick={() => onCopy(server.url)}>
            <Copy className="size-3.5" />
            Copy
          </Button>
        </div>
      </div>
      <p className="text-xs text-white/35">
        Listens on <span className="font-mono text-white/45">{server.host}</span>, port{" "}
        <span className="font-mono text-white/45">{server.port}</span>. The same address is saved to slagent-server.json
        in the app data folder.
      </p>
    </>
  )
}
