import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import type { SkillLocation } from "@shared/types"
import { isValidSkillName } from "./create-skill-presenter/create-skill-presenter"

export type CreateSkillDialogProps = {
  open: boolean
  status: "drafting" | "editing" | "saving" | "error"
  error: string | null
  guidance: string
  name: string
  description: string
  body: string
  location: SkillLocation
  onName: (name: string) => void
  onDescription: (description: string) => void
  onLocation: (location: SkillLocation) => void
  onOpenChange: (open: boolean) => void
  onCreate: () => void
}

export function CreateSkillDialog({
  open,
  status,
  error,
  guidance,
  name,
  description,
  body,
  location,
  onName,
  onDescription,
  onLocation,
  onOpenChange,
  onCreate,
}: CreateSkillDialogProps) {
  const drafting = status === "drafting"
  const saving = status === "saving"
  const busy = drafting || saving
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onOpenChange(false)
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create skill</DialogTitle>
          <DialogDescription>Drafted from your last exchange. Saved as a folder with a SKILL.md.</DialogDescription>
        </DialogHeader>
        {guidance !== "" && <p className="text-sm text-muted-foreground">Guidance: {guidance}</p>}
        {drafting && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner /> Drafting the skill…
          </p>
        )}
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="create-skill-name">Name</Label>
            <Input
              id="create-skill-name"
              value={name}
              disabled={busy}
              placeholder="release-slagent-version"
              onChange={(event) => onName(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="create-skill-description">Description</Label>
            <Input
              id="create-skill-description"
              value={description}
              disabled={busy}
              placeholder="What the skill does, so the agent picks it up"
              onChange={(event) => onDescription(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Install location</Label>
            <Select value={location} onValueChange={(next) => onLocation(next as SkillLocation)} disabled={busy}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">~/.agents/skills (all projects)</SelectItem>
                <SelectItem value="project">.agents/skills (this project)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {body !== "" && (
            <div className="grid gap-1.5">
              <Label>Drafted instructions</Label>
              <pre className="max-h-48 overflow-auto rounded-md border bg-muted/40 p-3 text-xs whitespace-pre-wrap text-foreground/80">{body}</pre>
            </div>
          )}
        </div>
        {error !== null && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={busy || !isValidSkillName(name)} onClick={() => onCreate()}>
            {saving ? "Creating" : "Create skill"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}