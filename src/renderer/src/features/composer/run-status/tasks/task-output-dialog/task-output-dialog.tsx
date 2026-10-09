import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export type DialogTask = {
  label: string
  command: string
  statusText: string
}

export type TaskOutputDialogProps = {
  task: DialogTask | null
  output: string
  onClose: () => void
  bindBottom: (element: HTMLDivElement | null) => void
}

export function TaskOutputDialog({ task, output, onClose, bindBottom }: TaskOutputDialogProps) {
  return (
    <Dialog
      open={task !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{task?.label}</DialogTitle>
          <DialogDescription className="font-mono text-xs break-all">{task?.command}</DialogDescription>
        </DialogHeader>
        <Card className="max-h-96 overflow-auto p-3">
          <pre className="font-mono text-xs whitespace-pre-wrap">{output}</pre>
          <div ref={bindBottom} />
        </Card>
        {task !== null ? <p className="mt-2 text-xs text-muted-foreground">{task.statusText}</p> : null}
      </DialogContent>
    </Dialog>
  )
}
