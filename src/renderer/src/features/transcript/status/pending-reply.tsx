import { Shimmer } from "@/components/ai-elements/shimmer"
import { Spinner } from "@/components/ui/spinner"

export type PendingReplyProps = {
  // The run's notice when there is one, otherwise "Thinking".
  label: string
}

// The line at the foot of the transcript while the model has not answered yet.
export function PendingReply({ label }: PendingReplyProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
      <Spinner className="size-3.5" />
      <Shimmer>{label}</Shimmer>
    </div>
  )
}
