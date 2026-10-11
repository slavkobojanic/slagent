import { LoaderCircle, Power } from "lucide-react"
import type { DaemonStatus } from "@shared/types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type DaemonSettingsProps = {
  daemon: DaemonStatus | null
  daemonBusy: boolean
  daemonError: string | null
  canEnable: boolean
  canDisable: boolean
  onEnable: () => void
  onDisable: () => void
}

export function DaemonSettings({
  daemon,
  daemonBusy,
  daemonError,
  canEnable,
  canDisable,
  onEnable,
  onDisable,
}: DaemonSettingsProps) {
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
