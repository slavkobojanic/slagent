import { Button } from "@/components/ui/button"

export type SaveBarProps = {
  dirty: boolean
  saving: boolean
  canSave: boolean
  error: string | null
  onSave: () => void
}

export function SaveBar({ dirty, saving, canSave, error, onSave }: SaveBarProps) {
  return (
    <>
      {error !== null ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <Button type="button" disabled={!canSave} onClick={onSave}>
          {saving ? "Saving" : "Save"}
        </Button>
        {dirty ? <span className="text-xs text-white/40">Unsaved changes</span> : null}
      </div>
    </>
  )
}
