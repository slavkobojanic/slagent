import { SparklesIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export type CommitMessageProps = {
  message: string
  placeholder: string
  canEditMessage: boolean
  canWriteMessage: boolean
  writingMessage: boolean
  onMessageChange: (value: string) => void
  onCommitShortcut: () => void
  onWriteMessage: () => void
}

export function CommitMessage({
  message,
  placeholder,
  canEditMessage,
  canWriteMessage,
  writingMessage,
  onMessageChange,
  onCommitShortcut,
  onWriteMessage,
}: CommitMessageProps) {
  return (
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
  )
}
