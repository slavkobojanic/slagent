import { Button } from "@/components/ui/button"

export type CommitActionsProps = {
  canCommit: boolean
  canPublish: boolean
  pushLabel: string
  onCommit: () => void
  onPush: () => void
  onOpenPr: () => void
}

export function CommitActions({ canCommit, canPublish, pushLabel, onCommit, onPush, onOpenPr }: CommitActionsProps) {
  return (
    <div className="flex gap-2">
      <Button type="button" size="sm" className="flex-1" disabled={!canCommit} onClick={onCommit}>
        Commit all
      </Button>
      <Button type="button" size="sm" variant="outline" disabled={!canPublish} onClick={onPush}>
        {pushLabel}
      </Button>
      <Button type="button" size="sm" variant="outline" disabled={!canPublish} onClick={onOpenPr}>
        Open PR
      </Button>
    </div>
  )
}
