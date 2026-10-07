export type ChatTitleProps = {
  // Null for a draft.
  title: string | null
}

export function ChatTitle({ title }: ChatTitleProps) {
  if (title === null) {
    return null
  }
  return (
    <>
      <span className="text-foreground/25">/</span>
      <span className="min-w-0 truncate text-sm text-foreground/50" title={title}>
        {title}
      </span>
    </>
  )
}
