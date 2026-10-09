import { MessageResponse } from "@/components/ai-elements/message"
import { Button } from "@/components/ui/button"

export type PlanOverlayProps = {
  // The plan to read before deciding, when no side panel shows it.
  plan: string | null
  approving: boolean
  onAccept: () => void
  onRevise: () => void
  onCancel: () => void
}

// A scrim over the chat column only: the right panel stays readable with the full plan.
export function PlanOverlay({ plan, approving, onAccept, onRevise, onCancel }: PlanOverlayProps) {
  if (plan !== null) {
    return (
      <div className="absolute inset-0 z-20 flex flex-col bg-background" aria-label="Plan ready">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm" aria-label="Plan document">
          <MessageResponse>{plan}</MessageResponse>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border p-3">
          <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={onRevise}>
            Revise
          </Button>
          <Button type="button" size="lg" disabled={approving} onClick={onAccept}>
            Accept and build
          </Button>
        </div>
      </div>
    )
  }
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