import { Message, MessageAction, MessageActions, MessageContent } from "@/components/ai-elements/message"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { RewindMode, UserMessage } from "@shared/types"
import { PencilIcon, RotateCcwIcon } from "lucide-react"

export type UserTurnProps = {
  message: UserMessage
  // Whether the message has an entry the chat can edit or rewind to: not while a run is going.
  editable: boolean
  // Whether the "Edit earlier message?" confirmation is open.
  confirming: boolean
  onEdit: () => void
  onRewind: (mode: RewindMode) => void
  onOpenFile: (path: string, line?: number) => void
  onConfirmEdit: () => void
  onCancelConfirm: () => void
}

// A message the user sent: its attachments, the replies and diff comments it carried, its text,
// and the edit and rewind actions that show on hover.
export function UserTurn({
  message,
  editable,
  confirming,
  onEdit,
  onRewind,
  onOpenFile,
  onConfirmEdit,
  onCancelConfirm,
}: UserTurnProps) {
  const attachments = message.attachments ?? []
  return (
    <Message from="user" className="group" data-message-id={message.id}>
      {attachments.length > 0 ? (
        <div className="flex flex-wrap justify-end gap-2">
          {attachments.map((attachment) => {
            if (attachment.kind === "image" && attachment.url) {
              return <img key={attachment.id} src={attachment.url} alt={attachment.name} className="max-h-48 max-w-full rounded-md" />
            }
            return (
              <span key={attachment.id} className="rounded-md border border-white/15 px-2 py-1 text-xs">
                {attachment.name}
              </span>
            )
          })}
        </div>
      ) : null}
      {message.replies?.length ? (
        <div className="ml-auto w-full max-w-4/5 divide-y divide-white/10 rounded-md bg-white/5 px-3 text-xs">
          {message.replies.map((reply) => (
            <div key={reply.id} className="space-y-1.5 py-2.5">
              <blockquote className="line-clamp-3 border-l-2 border-warning/50 pl-2 whitespace-pre-wrap text-white/50">{reply.quote}</blockquote>
              <p className="whitespace-pre-wrap">{reply.text}</p>
            </div>
          ))}
        </div>
      ) : null}
      {message.text ? <MessageContent className="whitespace-pre-wrap">{message.text}</MessageContent> : null}
      {message.comments?.length ? (
        <div className="ml-auto w-full max-w-4/5 divide-y divide-white/10 rounded-md bg-white/5 px-3 text-xs">
          {message.comments.map((comment) => (
            <div key={comment.id} className="space-y-1 py-2.5">
              <button
                type="button"
                className="block font-mono text-white/50 hover:text-white hover:underline"
                onClick={() => onOpenFile(comment.path, comment.line)}
              >
                {comment.path}:{comment.line}
              </button>
              {comment.code.trim() ? <p className="truncate font-mono text-white/40">{comment.code.trim()}</p> : null}
              <p className="whitespace-pre-wrap">{comment.text}</p>
            </div>
          ))}
        </div>
      ) : null}
      {editable ? (
        <MessageActions className="justify-end opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <MessageAction tooltip="Edit and resend" onClick={onEdit}>
            <PencilIcon className="size-3.5" />
          </MessageAction>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <MessageAction label="Rewind">
                <RotateCcwIcon className="size-3.5" />
              </MessageAction>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Go back to before this message</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={!message.checkpoint} onSelect={() => onRewind("both")}>
                Rewind code and chat
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onRewind("chat")}>Rewind chat only</DropdownMenuItem>
              <DropdownMenuItem disabled={!message.checkpoint} onSelect={() => onRewind("code")}>
                Rewind code only
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </MessageActions>
      ) : null}
      <Dialog
        open={confirming}
        onOpenChange={(open) => {
          if (!open) {
            onCancelConfirm()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit earlier message?</DialogTitle>
            <DialogDescription>Sending the edit replaces this message and deletes everything after it in the chat.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancelConfirm}>
              Cancel
            </Button>
            <Button type="button" onClick={onConfirmEdit}>
              Edit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Message>
  )
}
