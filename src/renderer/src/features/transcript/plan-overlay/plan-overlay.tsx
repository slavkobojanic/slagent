import { Button } from "@/components/ui/button"

export type PlanOverlayProps = {
  approving: boolean
  onAccept: () => void
  onRevise: () => void
  onCancel: () => void
}

// A scrim over the chat column only: the right panel stays readable with the full plan.
export function PlanOverlay({ approving, onAccept, onRevise, onCancel }: PlanOverlayProps) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/25 backdrop-blur-md" aria-label="Plan ready">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background/90 p-2 shadow-lg">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" variant="outline" onClick={onRevise}>
          Revise
        </Button>
        <Button type="button" disabled={approving} onClick={onAccept}>
          Accept and build
        </Button>
      </div>
    </div>
  )
}