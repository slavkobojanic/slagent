import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export type ChatDeletionDialogProps = {
  open: boolean
  chatTitle: string
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}

// Confirms before a chat is deleted. The conversation goes, the project folder stays.
export function ChatDeletionDialog({ open, chatTitle, busy, onCancel, onConfirm }: ChatDeletionDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onCancel()
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete chat</DialogTitle>
          <DialogDescription>This removes the conversation. The project folder stays.</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-foreground/70">{chatTitle}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onCancel()}>
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={() => onConfirm()}>
            {busy ? "Deleting" : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
