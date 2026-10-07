import { Loader2 } from "lucide-react"
import type { CliStatus } from "@shared/types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type CliSettingsProps = {
  status: CliStatus | null
  ownsCommand: boolean
  canInstall: boolean
  canUninstall: boolean
  installing: boolean
  uninstalling: boolean
  error: string | null
  onInstall: () => void
  onUninstall: () => void
}

const CLI_STATE_LABELS: Record<CliStatus["state"], { label: string; dot: string }> = {
  installed: { label: "Installed", dot: "bg-success" },
  outdated: { label: "Update available", dot: "bg-warning" },
  missing: { label: "Not installed", dot: "bg-white/30" },
  conflict: { label: "Path in use", dot: "bg-destructive" },
  unsupported: { label: "macOS only", dot: "bg-white/30" },
}

export function CliSettings({
  status,
  ownsCommand,
  canInstall,
  canUninstall,
  installing,
  uninstalling,
  error,
  onInstall,
  onUninstall,
}: CliSettingsProps) {
  const state = status?.state
  let installLabel = "Install command"
  if (state === "outdated") {
    installLabel = "Update command"
  }
  if (installing) {
    installLabel = "Installing"
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">Command line</h2>
        {state ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-white/70">
            <span className={cn("size-1.5 rounded-full", CLI_STATE_LABELS[state].dot)} />
            {CLI_STATE_LABELS[state].label}
          </span>
        ) : null}
      </div>
      <p className="text-sm text-white/60">
        Open slagent from a terminal. Pass a folder to open it as a project, or nothing to just bring up the app.
      </p>
      <div className="space-y-1 rounded-md border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-xs text-white/80">
        <div>
          slagent .<span className="text-white/35">{"  "}# open this folder</span>
        </div>
        <div>
          slagent ~/code/app<span className="text-white/35">{"  "}# open another folder</span>
        </div>
        <div>
          slagent<span className="text-white/35">{"  "}# open the app</span>
        </div>
      </div>
      {state === "conflict" ? (
        <p className="text-xs text-destructive/80">
          Another program already has a file at <span className="font-mono">{status?.path}</span>. Remove it to install
          slagent&apos;s command there.
        </p>
      ) : null}
      {error !== null ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <CommandActions
        unsupported={state === "unsupported"}
        showInstall={state !== "installed"}
        showUninstall={ownsCommand}
        canInstall={canInstall}
        canUninstall={canUninstall}
        installing={installing}
        uninstalling={uninstalling}
        installLabel={installLabel}
        onInstall={onInstall}
        onUninstall={onUninstall}
      />
      {status ? (
        <p className="text-xs text-white/35">
          Installs to <span className="font-mono text-white/45">{status.path}</span>, which is already on your PATH. macOS
          asks for your password to write there.
        </p>
      ) : null}
    </div>
  )
}

function CommandActions({
  unsupported,
  showInstall,
  showUninstall,
  canInstall,
  canUninstall,
  installing,
  uninstalling,
  installLabel,
  onInstall,
  onUninstall,
}: {
  unsupported: boolean
  showInstall: boolean
  showUninstall: boolean
  canInstall: boolean
  canUninstall: boolean
  installing: boolean
  uninstalling: boolean
  installLabel: string
  onInstall: () => void
  onUninstall: () => void
}) {
  if (unsupported) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showInstall ? (
        <Button type="button" disabled={!canInstall} onClick={onInstall}>
          {installing ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {installLabel}
        </Button>
      ) : null}
      {showUninstall ? (
        <Button
          type="button"
          variant="ghost"
          className="ml-auto text-white/50 hover:text-destructive"
          disabled={!canUninstall}
          onClick={onUninstall}
        >
          {uninstalling ? "Removing" : "Uninstall"}
        </Button>
      ) : null}
    </div>
  )
}
