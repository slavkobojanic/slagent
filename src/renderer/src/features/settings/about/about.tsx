import type { UpdateCheckResult } from "@shared/types"
import { Button } from "@/components/ui/button"

export type AboutProps = {
  version: string | null
  checking: boolean
  result: UpdateCheckResult | null
  readyVersion: string | null
  installing: boolean
  error: string | null
  onCheck: () => void
  onInstall: () => void
}

type CheckedResult = Exclude<UpdateCheckResult, { status: "ready" }>

function checkStatus(result: CheckedResult): { text: string; kind: "muted" | "info" | "destructive" } {
  switch (result.status) {
    case "up-to-date":
      return { text: "You're up to date.", kind: "muted" }
    case "available":
      return { text: `slagent ${result.version} is available. It's downloading in the background.`, kind: "info" }
    case "error":
      return { text: result.message, kind: "destructive" }
    case "disabled":
      return { text: "Updates are only available in the released app.", kind: "muted" }
  }
}

export function About({ version, checking, result, readyVersion, installing, error, onCheck, onInstall }: AboutProps) {
  const status = result && result.status !== "ready" ? checkStatus(result) : null

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium">About</h2>
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-medium text-white">
          slagent {version !== null ? <span className="font-mono text-white/70">{version}</span> : null}
        </p>
        {readyVersion !== null ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-white/70">
            <span className="size-1.5 rounded-full bg-warning" />
            {readyVersion} ready to install
          </span>
        ) : null}
      </div>
      <p className="text-sm text-white/60">
        A coding agent that lives in your menu bar, with full access to your projects, shell and apps.
      </p>
      {checking ? <p className="text-xs text-white/50">Checking for updates…</p> : null}
      {status !== null ? (
        <p
          role="status"
          className={
            status.kind === "destructive" ? "text-sm text-destructive" : status.kind === "info" ? "text-sm text-white/80" : "text-xs text-white/50"
          }
        >
          {status.text}
        </p>
      ) : null}
      {error !== null ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={checking} onClick={onCheck}>
          {checking ? "Checking…" : "Check for Updates"}
        </Button>
        {readyVersion !== null ? (
          <Button type="button" size="sm" className="bg-info text-white hover:bg-info/90" disabled={installing} onClick={onInstall}>
            {installing ? "Restarting…" : `Restart to Update (v${readyVersion})`}
          </Button>
        ) : null}
      </div>
    </div>
  )
}