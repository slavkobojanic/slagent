import { MessageResponse } from "@/components/ai-elements/message"

export type PlanDocumentProps = {
  plan: string
}

// The plan the agent proposed, shown read-only. Approving it happens in the transcript.
export function PlanDocument({ plan }: PlanDocumentProps) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm" aria-label="Plan document">
      <MessageResponse>{plan}</MessageResponse>
    </div>
  )
}
