import type { ComponentType } from "react"
import type { CliStatus } from "@shared/types"
import { cn } from "@/lib/utils"

export type CliSettingsProps = {
  status: CliStatus | null
  error: string | null
  InstallCommand: ComponentType
  UninstallCommand: ComponentType
}

const CLI_STATE_LABELS: Record<CliStatus["state"], { label: string; dot: string }> = {
  installed: { label: "Installed", dot: "bg-success" },
  outdated: { label: "Update available", dot: "bg-warning" },
  missing: { label: "Not installed", dot: "bg-white/30" },
  conflict: { label: "Path in use", dot: "bg-destructive" },
  unsupported: { label: "macOS only", dot: "bg-white/30" },
}

export function CliSettings({ status, error, InstallCommand, UninstallCommand }: CliSettingsProps) {
  const state = status?.state

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
      {state === "unsupported" ? null : (
        <div className="flex flex-wrap items-center gap-2">
          <InstallCommand />
          <UninstallCommand />
        </div>
      )}
      {status ? (
        <p className="text-xs text-white/35">
          Installs to <span className="font-mono text-white/45">{status.path}</span>, which is already on your PATH. macOS
          asks for your password to write there.
        </p>
      ) : null}
    </div>
  )
}
