import { CodeXml } from "lucide-react"
import { Button } from "@/components/ui/button"

export type EditorToggleProps = {
  on: boolean
  disabled: boolean
  onToggle: () => void
}

export function EditorToggle({ on, disabled, onToggle }: EditorToggleProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={on ? "Back to chat" : "Open editor"}
      aria-pressed={on}
      title={on ? "Back to chat" : "Open editor"}
      disabled={disabled}
      onClick={onToggle}
    >
      <CodeXml className="size-4" />
    </Button>
  )
}
