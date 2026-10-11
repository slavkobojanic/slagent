import { BadgeCheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export type ExtensionResultProps = {
  id: string
  name: string
  description: string
  downloads: string
  verified: boolean
  installed: boolean
  busy: boolean
  onInstall: () => void
}

export function ExtensionResult({ id, name, description, downloads, verified, installed, busy, onInstall }: ExtensionResultProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-sm">
          <span className="truncate">{name}</span>
          {verified ? <BadgeCheckIcon aria-label="Verified publisher" className="size-3.5 shrink-0 text-info" /> : null}
        </div>
        <div className="truncate text-xs text-white/50">{id}</div>
        {description ? <div className="line-clamp-2 text-xs text-white/60">{description}</div> : null}
        <div className="text-xs text-white/40">{downloads} downloads</div>
      </div>
      <Button type="button" size="sm" variant={installed ? "ghost" : "default"} disabled={installed || busy} onClick={onInstall}>
        {installed ? "Installed" : busy ? "Installing" : "Install"}
      </Button>
    </div>
  )
}
