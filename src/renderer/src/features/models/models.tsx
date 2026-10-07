import "@/features/models/models.css"
import type { ComponentType } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

export type ModelsProps = {
  open: boolean
  query: string
  overflowNotice: string | null
  error: string | null
  onOpenChange: (open: boolean) => void
  onQueryChange: (value: string) => void
  ModelList: ComponentType
}

export function Models({ open, query, overflowNotice, error, onOpenChange, onQueryChange, ModelList }: ModelsProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Model</DialogTitle>
          <DialogDescription>
            Claude Code models use your Claude Code login. The rest come from OpenRouter. A chat stays on one, so
            switching between them starts a new chat.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={query}
          autoFocus
          placeholder="Search models"
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <div className="mt-3 max-h-80 overflow-y-auto rounded-md border border-border">
          <ModelList />
        </div>
        {overflowNotice === null ? null : <p className="mt-2 text-xs text-muted-foreground">{overflowNotice}</p>}
        {error === null ? null : (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
