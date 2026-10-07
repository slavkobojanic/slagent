import { Button } from "@/components/ui/button"

export type KeyActionsProps = {
  canSave: boolean
  saving: boolean
  canRemove: boolean
  removing: boolean
  oauth: boolean
  onCreateKey: () => void
  onRemove: () => void
}

export function KeyActions({ canSave, saving, canRemove, removing, oauth, onCreateKey, onRemove }: KeyActionsProps) {
  const saveLabel = saving ? "Saving" : "Save key"
  let removeLabel = "Remove saved key"
  if (oauth) {
    removeLabel = "Sign out"
  }
  if (removing) {
    removeLabel = "Removing"
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" onClick={onCreateKey}>
        Create a key
      </Button>
      <Button type="submit" disabled={!canSave}>
        {saveLabel}
      </Button>
      {canRemove ? (
        <Button
          type="button"
          variant="ghost"
          className="ml-auto text-white/50 hover:text-destructive"
          disabled={removing}
          onClick={onRemove}
        >
          {removeLabel}
        </Button>
      ) : null}
    </div>
  )
}
