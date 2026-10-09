import { Copy, LoaderCircle, Power } from "lucide-react"
import type { DaemonStatus, ServerInfo } from "@shared/types"
import { Button } from "@/components/ui/button"
import type { QrShape } from "@/lib/qr"
import { cn } from "@/lib/utils"

export type ConnectSettingsProps = {
  server: ServerInfo | null
  // The connect link as a QR code, when a phone on the tailnet can reach the server.
  qr: QrShape | null
  daemon: DaemonStatus | null
  daemonBusy: boolean
  daemonError: string | null
  canEnable: boolean
  canDisable: boolean
  onCopy: (text: string) => void
  onEnable: () => void
  onDisable: () => void
}

export function ConnectSettings(props: ConnectSettingsProps) {
  const { server, qr, onCopy } = props
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
      <DaemonSettings {...props} />
    </div>
  )
}

function Body({ server, qr, onCopy }: Pick<ConnectSettingsProps, "server" | "qr" | "onCopy">) {
  if (server === null) {
    return <p className="text-sm text-white/60">The server has not started yet. Restart the app and try again.</p>
  }
  return (
    <>
      <div className="overflow-hidden rounded-xl bg-white/3">
        {qr !== null ? (
          <div className="flex items-center gap-5 p-4">
            {/* Fixed colours: the light theme swaps white and black, and a QR code reads best dark on light. */}
            <svg
              role="img"
              aria-label="QR code for the slagent iOS app"
              viewBox={`-4 -4 ${qr.size + 8} ${qr.size + 8}`}
              className="size-32 shrink-0 rounded-lg bg-[#fff]"
              shapeRendering="crispEdges"
            >
              <path d={qr.path} className="fill-[#000]" />
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

function DaemonSettings({
  daemon,
  daemonBusy,
  daemonError,
  canEnable,
  canDisable,
  onEnable,
  onDisable,
}: Pick<ConnectSettingsProps, "daemon" | "daemonBusy" | "daemonError" | "canEnable" | "canDisable" | "onEnable" | "onDisable">) {
  if (daemon !== null && !daemon.supported) return null
  const running = daemon?.running === true
  const installed = daemon?.installed === true
  const stateLabel = running ? "Running" : installed ? "Waiting for the app to quit" : "Not installed"
  const stateDot = running ? "bg-success" : installed ? "bg-warning" : "bg-white/30"
  return (
    <div className="rounded-xl bg-white/3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">Background daemon</h3>
          <span className="inline-flex items-center gap-1.5 text-xs text-white/70">
            <span className={cn("size-1.5 rounded-full", stateDot)} />
            {stateLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {daemonBusy ? <LoaderCircle className="size-3.5 animate-spin text-white/50" /> : null}
          {installed ? (
            <Button type="button" variant="outline" size="xs" disabled={!canDisable} onClick={onDisable}>
              <Power className="size-3.5" />
              Remove
            </Button>
          ) : (
            <Button type="button" variant="outline" size="xs" disabled={!canEnable} onClick={onEnable}>
              <Power className="size-3.5" />
              Install
            </Button>
          )}
        </div>
      </div>
      <p className="mt-2 text-sm text-white/60">
        {installed
          ? "A launchd agent keeps a headless slagent running, so your phone can reach it while the app is closed. It starts when you quit the app, and again whenever the Mac turns on."
          : "Install a launchd agent that keeps a headless slagent running, so your phone can reach it while the app is closed and whenever the Mac turns on."}
      </p>
      {daemonError !== null ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {daemonError}
        </p>
      ) : null}
    </div>
  )
}
