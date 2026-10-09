import { Check, Pencil, X } from "lucide-react"
import type { ServerAddress } from "@/lib/server-address"
import { addressLabel, addressLabelWith } from "@/lib/server-address"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export type SavedServersProps = {
  servers: ServerAddress[]
  // Nicknames keyed by "host:port", shown instead of the Mac's hostname.
  nicknames: Record<string, string>
  // Which row's rename box is open, keyed like the nicknames, and its draft.
  editing: string | null
  draft: string
  onRenameStart: (address: ServerAddress) => void
  onRenameChange: (value: string) => void
  onRenameSave: () => void
  onRenameCancel: () => void
  // Rendered above the list, and hidden with it when the list is empty.
  heading?: string
  onPick: (address: ServerAddress) => void
  onRemove: (address: ServerAddress) => void
}

// One row per Mac this phone has connected to, newest first.
export function SavedServers({ servers, nicknames, editing, draft, onRenameStart, onRenameChange, onRenameSave, onRenameCancel, heading, onPick, onRemove }: SavedServersProps) {
  if (servers.length === 0) {
    return null
  }
  return (
    <div className="space-y-2">
      {heading ? <h3 className="text-sm font-medium">{heading}</h3> : null}
      <div className="space-y-2">
      {servers.map((address) => {
        const key = `${address.host}:${address.port}`
        return (
          <Card key={key} className="flex items-center gap-2">
            {editing === key ? (
              <div className="flex min-w-0 flex-1 items-center gap-1">
                <Input
                  autoFocus
                  value={draft}
                  onChange={(event) => onRenameChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") onRenameSave()
                    if (event.key === "Escape") onRenameCancel()
                  }}
                  aria-label="Nickname"
                  placeholder={addressLabel(address)}
                  className="h-8"
                />
                <Button type="button" variant="ghost" size="icon" aria-label="Save nickname" onClick={onRenameSave}>
                  <Check className="size-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" aria-label="Cancel rename" onClick={onRenameCancel}>
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{addressLabelWith(address, nicknames)}</p>
                  <p className="truncate font-mono text-xs text-white/50">
                    {address.host}:{address.port}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label={`Rename ${addressLabelWith(address, nicknames)}`} onClick={() => onRenameStart(address)}>
                  <Pencil className="size-4" />
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => onPick(address)}>
                  Connect
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Forget ${addressLabelWith(address, nicknames)}`}
                  onClick={() => onRemove(address)}
                >
                  <X className="size-4" />
                </Button>
              </>
            )}
          </Card>
        )
      })}
      </div>
    </div>
  )
}
