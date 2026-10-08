import { Copy } from "lucide-react"
import type { ServerInfo } from "@shared/types"
import { Button } from "@/components/ui/button"

export type ConnectSettingsProps = {
  server: ServerInfo | null
  onCopy: (text: string) => void
}

export function ConnectSettings({ server, onCopy }: ConnectSettingsProps) {
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
      {server === null ? (
        <p className="text-sm text-white/60">The server has not started yet. Restart the app and try again.</p>
      ) : (
        <>
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
      )}
    </div>
  )
}
