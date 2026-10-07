import { MessageResponse } from "@/components/ai-elements/message"

export type PlanDocumentProps = {
  plan: string
}

export function PlanDocument({ plan }: PlanDocumentProps) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm" aria-label="Plan document">
      <MessageResponse>{plan}</MessageResponse>
    </div>
  )
}
