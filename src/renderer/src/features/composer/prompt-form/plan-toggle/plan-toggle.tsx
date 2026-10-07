import { ListChecksIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type PlanToggleProps = {
  planMode: boolean
  disabled: boolean
  onToggle: () => void
}

export function PlanToggle({ planMode, disabled, onToggle }: PlanToggleProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("h-7 gap-1.5 px-2", planMode ? "bg-white/10 text-warning hover:text-warning" : "text-white/60")}
      aria-pressed={planMode}
      title="Plan mode (Shift+Tab): research and propose a plan before changing anything"
      disabled={disabled}
      onClick={onToggle}
    >
      <ListChecksIcon className="size-3.5" />
      Plan
    </Button>
  )
}
