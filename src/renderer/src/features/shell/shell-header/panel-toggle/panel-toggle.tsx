import { PanelRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export type PanelToggleProps = {
  open: boolean
  title: string
  disabled: boolean
  onToggle: () => void
}

export function PanelToggle({ open, title, disabled, onToggle }: PanelToggleProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={open ? "Hide panel" : "Show panel"}
      aria-pressed={open}
      title={title}
      disabled={disabled}
      onClick={onToggle}
    >
      <PanelRight className="size-4" />
    </Button>
  )
}
