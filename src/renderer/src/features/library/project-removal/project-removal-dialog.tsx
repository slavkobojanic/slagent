import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type ProjectRemovalDialogProps = {
  open: boolean
  projectName: string
  projectPath: string
  typed: string
  confirmed: boolean
  busy: boolean
  onTypedChange: (value: string) => void
  onCancel: () => void
  onConfirm: () => void
}

// Removes a project only after its name is typed in, because the folder is deleted from disk.
export function ProjectRemovalDialog({
  open,
  projectName,
  projectPath,
  typed,
  confirmed,
  busy,
  onTypedChange,
  onCancel,
  onConfirm,
}: ProjectRemovalDialogProps) {
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
          <DialogTitle>Remove project</DialogTitle>
          <DialogDescription>This stops chats in the project, deletes the folder from disk, and deletes its saved chats.</DialogDescription>
        </DialogHeader>
        <p className="font-mono text-xs break-all text-foreground/50">{projectPath}</p>
        <div className="mt-4 space-y-2">
          <Label htmlFor="confirm-project-name">Type {projectName} to confirm</Label>
          <Input id="confirm-project-name" value={typed} autoComplete="off" onChange={(event) => onTypedChange(event.target.value)} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onCancel()}>
            Cancel
          </Button>
          <Button type="button" disabled={!confirmed || busy} onClick={() => onConfirm()}>
            {busy ? "Deleting" : "Delete folder"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
