import { HighlighterIcon, MessageSquareIcon, XIcon } from "lucide-react"

export type PendingReplyRow = { id: string; quote: string; text: string }
export type PendingDiffRow = { id: string; location: string; text: string }

export type PendingCommentsProps = {
  label: string
  replies: PendingReplyRow[]
  diffs: PendingDiffRow[]
  onRemoveReply: (id: string) => void
  onRemoveDiff: (id: string) => void
}

export function PendingComments({ label, replies, diffs, onRemoveReply, onRemoveDiff }: PendingCommentsProps) {
  if (replies.length + diffs.length === 0) {
    return null
  }
  return (
    <div className="mb-2 rounded-md bg-white/5 px-3 py-2.5 text-xs">
      <p className="mb-1.5 text-white/50">{label} will be sent with your next message</p>
      <ul className="max-h-32 space-y-1 overflow-y-auto">
        {replies.map((reply) => (
          <li key={reply.id} className="flex items-start gap-2">
            <HighlighterIcon className="mt-0.5 size-3 shrink-0 text-warning/70" />
            <span className="min-w-0 flex-1 truncate">
              <span className="text-white/50">“{reply.quote}”</span> {reply.text}
            </span>
            <button type="button" className="text-white/40 hover:text-white" aria-label="Remove comment" onClick={() => onRemoveReply(reply.id)}>
              <XIcon className="size-3.5" />
            </button>
          </li>
        ))}
        {diffs.map((diff) => (
          <li key={diff.id} className="flex items-start gap-2">
            <MessageSquareIcon className="mt-0.5 size-3 shrink-0 text-white/40" />
            <span className="min-w-0 flex-1 truncate">
              <span className="font-mono text-white/50">{diff.location}</span> {diff.text}
            </span>
            <button type="button" className="text-white/40 hover:text-white" aria-label="Remove comment" onClick={() => onRemoveDiff(diff.id)}>
              <XIcon className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
