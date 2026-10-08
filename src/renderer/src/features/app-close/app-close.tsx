import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export type AppCloseProps = {
  open: boolean
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function AppClose({ open, busy, onCancel, onConfirm }: AppCloseProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onCancel()
        }
      }}
    >
      {/* The blur is the point: the app behind the question goes soft while it asks. */}
      <DialogContent overlayClassName="fixed inset-0 z-50 bg-background/25 backdrop-blur-md">
        <DialogHeader>
          <DialogTitle>Close the window?</DialogTitle>
          <DialogDescription>The window closes and the app keeps running in the dock.</DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onCancel()}>
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={() => onConfirm()}>
            {busy ? "Closing" : "Close window"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
