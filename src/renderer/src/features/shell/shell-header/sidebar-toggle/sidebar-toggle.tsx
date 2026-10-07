import { PanelLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export type SidebarToggleProps = {
  open: boolean
  title: string
  onToggle: () => void
}

export function SidebarToggle({ open, title, onToggle }: SidebarToggleProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="no-drag"
      aria-label={open ? "Hide sidebar" : "Show sidebar"}
      title={title}
      aria-pressed={open}
      onClick={onToggle}
    >
      <PanelLeft className="size-4" />
    </Button>
  )
}
