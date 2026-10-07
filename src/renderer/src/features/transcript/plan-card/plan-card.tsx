import { MessageResponse } from "@/components/ai-elements/message"
import { Button } from "@/components/ui/button"

export type PlanCardProps = {
  plan: string
  // Whether an approval is in flight. Approve is disabled then.
  approving: boolean
  onApprove: () => void
}

// A plan the agent proposed and waits on. Nothing has changed until it is approved.
export function PlanCard({ plan, approving, onApprove }: PlanCardProps) {
  return (
    <section className="rounded-md border border-warning/40 bg-warning/10" aria-label="Proposed plan">
      <header className="flex items-center gap-2 border-b border-warning/20 px-4 py-2 text-sm">
        <span className="font-medium text-warning">Proposed plan</span>
        <span className="text-xs text-muted-foreground">Nothing has changed yet.</span>
      </header>
      <div className="max-h-96 overflow-y-auto px-4 py-3">
        <MessageResponse>{plan}</MessageResponse>
      </div>
      <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-warning/20 px-4 py-2">
        <span className="mr-auto text-xs text-muted-foreground">Reply below to change the plan.</span>
        <Button type="button" size="sm" disabled={approving} onClick={onApprove}>
          Approve and build
        </Button>
      </footer>
    </section>
  )
}
