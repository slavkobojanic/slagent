import type { ComponentType } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export type ConnectionSheetProps = {
  open: boolean
  online: boolean
  label: string
  onOpenChange: (open: boolean) => void
  onForget: () => void
  Connect: ComponentType
}

export function ConnectionSheet({ open, online, label, onOpenChange, onForget, Connect }: ConnectionSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connection</DialogTitle>
          <DialogDescription>This phone talks to slagent on your Mac over Tailscale.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2.5">
            <span className={cn("size-2 shrink-0 rounded-full", online ? "bg-success" : "bg-warning")} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-sm">{label}</p>
              <p className="text-xs text-white/50">{online ? "Connected" : "Not connected"}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onForget}>
              Forget
            </Button>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Switch to another Mac</h3>
            <Connect />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
