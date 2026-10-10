import { Pencil } from "lucide-react"
import type { ComponentType } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export type ConnectionSheetProps = {
  open: boolean
  online: boolean
  label: string
  // The rename box on the connected Mac's card, where a nickname is typed.
  renaming: boolean
  draftNickname: string
  onRenameStart: () => void
  onRenameChange: (value: string) => void
  onRenameSave: () => void
  onRenameCancel: () => void
  onOpenChange: (open: boolean) => void
  onForget: () => void
  Connect: ComponentType
  // Other saved Macs to switch to with one tap, above the address form. The
  // connected one is left out: it already has its card above.
  SavedServers?: ComponentType
  // Tailnet machines running slagent, to connect to without pairing.
  Tailnet?: ComponentType
}

export function ConnectionSheet({ open, online, label, renaming, draftNickname, onRenameStart, onRenameChange, onRenameSave, onRenameCancel, onOpenChange, onForget, Connect, SavedServers, Tailnet }: ConnectionSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connection</DialogTitle>
          <DialogDescription>This phone talks to slagent on your Mac over Tailscale.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <Card className="flex items-center gap-3">
            <span className={cn("size-2 shrink-0 rounded-full", online ? "bg-success" : "bg-warning")} />
            {renaming ? (
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Input
                  autoFocus
                  value={draftNickname}
                  onChange={(event) => onRenameChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") onRenameSave()
                    if (event.key === "Escape") onRenameCancel()
                  }}
                  aria-label="Nickname"
                  placeholder={label}
                  className="h-8"
                />
                <Button type="button" variant="outline" size="sm" onClick={onRenameSave}>
                  Save
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={onRenameCancel}>
                  Cancel
                </Button>
              </div>
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm">{label}</p>
                  <p className="text-xs text-white/50">{online ? "Connected" : "Not connected"}</p>
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label="Rename" onClick={onRenameStart}>
                  <Pencil className="size-4" />
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={onForget}>
                  Forget
                </Button>
              </>
            )}
          </Card>
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Switch to another Mac</h3>
            {SavedServers ? <SavedServers /> : null}
            {Tailnet ? <Tailnet /> : null}
            <Connect />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
