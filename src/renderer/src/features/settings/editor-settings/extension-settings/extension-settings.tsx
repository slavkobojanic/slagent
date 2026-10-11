import { SearchIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ExtensionResult } from "@/features/settings/editor-settings/extension-settings/extension-result/extension-result"
import { ExtensionRow } from "@/features/settings/editor-settings/extension-settings/extension-row/extension-row"
import { SettingSwitch } from "@/features/settings/editor-settings/setting-switch/setting-switch"
import type { InstalledRow, ResultRow } from "@/lib/editor-extensions"

export type ExtensionSettingsProps = {
  vimOn: boolean
  vimBusy: boolean
  installed: InstalledRow[]
  query: string
  results: (ResultRow & { downloadsLabel: string })[]
  searching: boolean
  searched: boolean
  canSearch: boolean
  error: string | null
  onVim: (on: boolean) => void
  onToggle: (id: string) => void
  onUninstall: (id: string) => void
  onQuery: (query: string) => void
  onSearch: () => void
  onInstall: (id: string) => void
}

export function ExtensionSettings({
  vimOn,
  vimBusy,
  installed,
  query,
  results,
  searching,
  searched,
  canSearch,
  error,
  onVim,
  onToggle,
  onUninstall,
  onQuery,
  onSearch,
  onInstall,
}: ExtensionSettingsProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium">Extensions</h2>
      <p className="text-sm text-white/60">
        Installed from Open VSX and run inside the editor. Extensions are other people's code: install ones you trust. Extensions that need VS Code's desktop runtime load their
        grammars and themes but run no code.
      </p>
      <SettingSwitch label="Vim mode" description="Vim keybindings, from the VSCodeVim extension. Installs it the first time you switch it on." checked={vimOn} disabled={vimBusy} onChange={onVim} />
      {installed.length > 0 ? (
        <div className="divide-y divide-white/10">
          {installed.map((row) => (
            <ExtensionRow key={row.id} id={row.id} version={row.version} enabled={row.enabled} busy={row.busy} onToggle={() => onToggle(row.id)} onUninstall={() => onUninstall(row.id)} />
          ))}
        </div>
      ) : null}
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          onSearch()
        }}
      >
        <Input aria-label="Search Open VSX" placeholder="Search Open VSX" value={query} onChange={(event) => onQuery(event.target.value)} />
        <Button type="submit" size="sm" disabled={!canSearch}>
          <SearchIcon className="size-3.5" />
          {searching ? "Searching" : "Search"}
        </Button>
      </form>
      {error === null ? null : (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {searched && results.length === 0 ? <p className="text-sm text-white/50">Nothing found.</p> : null}
      <div className="divide-y divide-white/10">
        {results.map((result) => (
          <ExtensionResult
            key={result.id}
            id={result.id}
            name={result.name}
            description={result.description}
            downloads={result.downloadsLabel}
            verified={result.verified}
            installed={result.installed}
            busy={result.busy}
            onInstall={() => onInstall(result.id)}
          />
        ))}
      </div>
    </section>
  )
}
