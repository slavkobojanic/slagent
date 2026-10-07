import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"

export type SettingsButtonProps = {
  // True when an MCP server needs sign-in. The button then shows a badge.
  needsAuth: boolean
  onOpen: () => void
}

export function SettingsButton({ needsAuth, onOpen }: SettingsButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="relative"
      aria-label="Settings"
      data-genie-target="settings"
      onClick={onOpen}
    >
      <Settings className="size-4" />
      {needsAuth ? <span aria-hidden="true" className="absolute right-1 top-1 size-1.5 rounded-full bg-warning" /> : null}
    </Button>
  )
}
