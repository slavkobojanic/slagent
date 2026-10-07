import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

// The comment box shared by the diff panel and assistant responses.
function CommentDraft({
  initial = "",
  saveLabel = "Add comment",
  className,
  onSave,
  onCancel,
}: {
  initial?: string
  saveLabel?: string
  className?: string
  onSave: (text: string) => void
  onCancel: () => void
}) {
  const [text, setText] = useState(initial)
  const input = useRef<HTMLTextAreaElement | null>(null)

  // Pierre slots the annotation in after React mounts it, which drops
  // autoFocus, so focus is set once it is in place.
  useEffect(() => {
    let frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(() => {
        const field = input.current
        if (!field) return
        field.focus()
        field.setSelectionRange(field.value.length, field.value.length)
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])
  function save() {
    if (text.trim()) onSave(text.trim())
  }
  return (
    <div className={cn("mx-3 my-1.5 space-y-1.5 rounded-md border border-white/10 bg-secondary p-2 font-sans shadow-md", className)}>
      <Textarea
        ref={input}
        value={text}
        aria-label="Comment"
        placeholder="Comment for the next message"
        className="min-h-14 resize-none border-0 bg-transparent px-1 py-0.5 text-xs shadow-none focus-visible:ring-0 dark:bg-transparent"
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault()
            event.stopPropagation()
            onCancel()
          }
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            save()
          }
        }}
      />
      <div className="flex justify-end gap-1.5">
        <Button type="button" variant="ghost" size="xs" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="xs" disabled={!text.trim()} onClick={save}>
          {saveLabel}
        </Button>
      </div>
    </div>
  )
}

export { CommentDraft }
