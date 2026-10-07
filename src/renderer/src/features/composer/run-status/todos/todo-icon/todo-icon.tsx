import { CheckIcon, LoaderCircleIcon } from "lucide-react"
import { QueueItemIndicator } from "@/components/ai-elements/queue"
import { cn } from "@/lib/utils"

export type TodoIconProps = {
  status: "pending" | "in_progress" | "completed"
  label: string
  spinning: boolean
}

export function TodoIcon({ status, label, spinning }: TodoIconProps) {
  if (status === "completed") {
    return <CheckIcon className="size-2.5 shrink-0 text-muted-foreground/50" aria-label={label} />
  }
  if (status === "in_progress") {
    return <LoaderCircleIcon className={cn("size-2.5 shrink-0 text-muted-foreground", spinning && "animate-spin")} aria-label={label} />
  }
  return <QueueItemIndicator className="mt-0 shrink-0" aria-label={label} />
}
