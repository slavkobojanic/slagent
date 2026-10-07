import { PaperclipIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export type AttachButtonProps = {
  onAttach: () => void
}

export function AttachButton({ onAttach }: AttachButtonProps) {
  return (
    <Button type="button" variant="ghost" size="icon-sm" aria-label="Attach files" onClick={onAttach}>
      <PaperclipIcon className="size-4" />
    </Button>
  )
}
