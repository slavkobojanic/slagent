import type { DaemonStatus, ServerInfo } from "@shared/types"
import type { QrShape } from "@/lib/qr"
import { Body } from "./body"
import { DaemonSettings } from "./daemon-settings"

export type ConnectSettingsProps = {
  server: ServerInfo | null
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
      <DaemonSettings
        daemon={props.daemon}
        daemonBusy={props.daemonBusy}
        daemonError={props.daemonError}
        canEnable={props.canEnable}
        canDisable={props.canDisable}
        onEnable={props.onEnable}
        onDisable={props.onDisable}
      />
    </div>
  )
}
