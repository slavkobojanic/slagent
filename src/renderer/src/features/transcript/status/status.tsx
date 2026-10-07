import { PendingReply } from "./pending-reply"

export type StatusProps = {
  // Whether the model has not answered yet.
  pending: boolean
  notice: string | null
}

export function Status({ pending, notice }: StatusProps) {
  if (pending) {
    return <PendingReply label={notice ?? "Thinking"} />
  }
  if (notice) {
    return <p className="text-sm text-muted-foreground">{notice}</p>
  }
  return null
}
