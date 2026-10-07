import { SparklesIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export type DiffFooterProps = {
  message: string
  placeholder: string
  canEditMessage: boolean
  canWriteMessage: boolean
  writingMessage: boolean
  canCommit: boolean
  canPublish: boolean
  pushLabel: string
  onMessageChange: (value: string) => void
  onCommitShortcut: () => void
  onWriteMessage: () => void
  onCommit: () => void
  onPush: () => void
  onOpenPr: () => void
}

// The commit box under the diff: the message, a message written from the diff, commit, push, and
// opening a pull request.
export function DiffFooter({
  message,
  placeholder,
  canEditMessage,
  canWriteMessage,
  writingMessage,
  canCommit,
  canPublish,
  pushLabel,
  onMessageChange,
  onCommitShortcut,
  onWriteMessage,
  onCommit,
  onPush,
  onOpenPr,
}: DiffFooterProps) {
  return (
    <footer className="shrink-0 space-y-2 border-t border-white/10 p-3">
      <div className="relative">
        <Textarea
          value={message}
          placeholder={placeholder}
          aria-label="Commit message"
          className="min-h-16 pr-9 text-sm"
          disabled={!canEditMessage}
          onChange={(event) => onMessageChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && message.trim()) {
              event.preventDefault()
              onCommitShortcut()
            }
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="absolute top-1.5 right-1.5"
          aria-label="Write a commit message"
          title="Write a commit message from the diff"
          disabled={!canWriteMessage}
          onClick={onWriteMessage}
        >
          <SparklesIcon className={cn("size-3.5", writingMessage && "animate-pulse")} />
        </Button>
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" className="flex-1" disabled={!canCommit} onClick={onCommit}>
          Commit all
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={!canPublish} onClick={onPush}>
          {pushLabel}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={!canPublish} onClick={onOpenPr}>
          Open PR
        </Button>
      </div>
    </footer>
  )
}
