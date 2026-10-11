import { Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SettingSwitch } from "@/features/settings/editor-settings/setting-switch/setting-switch"

export type ExtensionRowProps = {
  id: string
  version: string
  enabled: boolean
  busy: boolean
  onToggle: () => void
  onUninstall: () => void
}

export function ExtensionRow({ id, version, enabled, busy, onToggle, onUninstall }: ExtensionRowProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <SettingSwitch label={id} description={`Version ${version}`} checked={enabled} disabled={busy} onChange={onToggle} />
      </div>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Uninstall ${id}`} disabled={busy} onClick={onUninstall}>
        <Trash2Icon className="size-3.5" />
      </Button>
    </div>
  )
}
