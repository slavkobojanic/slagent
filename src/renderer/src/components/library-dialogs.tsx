import { useEffect, useState } from "react"
import { toast } from "sonner"
import type { ChatSummary, ProjectSummary } from "@shared/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { errorText } from "@/lib/format"

function DeleteChatDialog({
  chat,
  onOpenChange,
}: {
  chat: ChatSummary | null
  onOpenChange: (open: boolean) => void
}) {
  const [removing, setRemoving] = useState(false)

  async function remove() {
    if (!chat) return
    setRemoving(true)
    try {
      await window.slagent.deleteChat(chat.id)
      onOpenChange(false)
    } catch (error) {
      toast.error(errorText(error))
    } finally {
      setRemoving(false)
    }
  }

  let label = "Delete"
  if (removing) label = "Deleting"

  return (
    <Dialog open={chat !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete chat</DialogTitle>
          <DialogDescription>This removes the conversation. The project folder stays.</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-white/70">{chat?.title}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={removing} onClick={() => void remove()}>
            {label}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function RemoveProjectDialog({
  project,
  onOpenChange,
}: {
  project: ProjectSummary | null
  onOpenChange: (open: boolean) => void
}) {
  const [typed, setTyped] = useState("")
  const [removing, setRemoving] = useState(false)

  useEffect(() => {
    setTyped("")
  }, [project?.id])

  async function remove() {
    if (!project) return
    setRemoving(true)
    try {
      await window.slagent.removeProject(project.id, typed)
      onOpenChange(false)
    } catch (error) {
      toast.error(errorText(error))
    } finally {
      setRemoving(false)
    }
  }

  let label = "Delete folder"
  if (removing) label = "Deleting"
  const confirmed = project !== null && typed === project.name

  return (
    <Dialog open={project !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove project</DialogTitle>
          <DialogDescription>
            This stops chats in the project, deletes the folder from disk, and deletes its saved chats.
          </DialogDescription>
        </DialogHeader>
        <p className="font-mono text-xs break-all text-white/50">{project?.path}</p>
        <div className="mt-4 space-y-2">
          <Label htmlFor="confirm-project-name">Type {project?.name} to confirm</Label>
          <Input id="confirm-project-name" value={typed} autoComplete="off" onChange={(event) => setTyped(event.target.value)} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!confirmed || removing} onClick={() => void remove()}>
            {label}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { DeleteChatDialog, RemoveProjectDialog }
