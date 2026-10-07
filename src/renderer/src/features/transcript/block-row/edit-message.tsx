import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export type EditMessageProps = {
  draft: string
  // Whether Send is allowed: a non-empty draft that is not already being sent.
  canSave: boolean
  saving: boolean
  onDraftChange: (value: string) => void
  onCancel: () => void
  onSave: () => void
}

// The inline editor that replaces a user message while it is being edited. Escape cancels;
// Cmd or Ctrl with Enter sends.
export function EditMessage({ draft, canSave, saving, onDraftChange, onCancel, onSave }: EditMessageProps) {
  return (
    <div className="ml-auto w-full max-w-4/5 space-y-2">
      <Textarea
        value={draft}
        autoFocus
        aria-label="Edit message"
        className="min-h-20 text-sm"
        onChange={(event) => onDraftChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault()
            onCancel()
          }
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            onSave()
          }
        }}
      />
      <p className="text-xs text-muted-foreground">Sending replaces this message and everything after it.</p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={onSave} disabled={!canSave}>
          Send
        </Button>
      </div>
    </div>
  )
}
