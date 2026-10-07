import { ChevronDownIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type QuestionHeaderProps = {
  header: string | undefined
  question: string
  open: boolean
  busy: boolean
  onToggleOpen: () => void
  onSkip: () => void
}

export function QuestionHeader({ header, question, open, busy, onToggleOpen, onSkip }: QuestionHeaderProps) {
  return (
    <header className="flex items-center gap-2.5 px-4 py-2.5">
      {header ? (
        <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-xs font-medium text-white/70 uppercase">{header}</span>
      ) : null}
      <p className="min-w-0 flex-1 text-sm font-medium">{question}</p>
      <Button type="button" variant="ghost" size="icon-xs" aria-label={open ? "Collapse" : "Expand"} onClick={() => onToggleOpen()}>
        <ChevronDownIcon className={cn("size-4 transition-transform duration-200", !open && "-rotate-90")} />
      </Button>
      <Button type="button" variant="ghost" size="icon-xs" title="Skip — let the agent decide" disabled={busy} onClick={() => onSkip()}>
        <XIcon className="size-4" />
      </Button>
    </header>
  )
}
