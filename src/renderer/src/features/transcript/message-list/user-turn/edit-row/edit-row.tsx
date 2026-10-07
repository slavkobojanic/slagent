import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export type EditRowProps = {
  draft: string
  canSave: boolean
  saving: boolean
  onDraftChange: (value: string) => void
  onCancel: () => void
  onSave: () => void
}

export function EditRow({ draft, canSave, saving, onDraftChange, onCancel, onSave }: EditRowProps) {
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
