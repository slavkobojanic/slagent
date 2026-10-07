export type ChatListFooterProps = {
  hiddenCount: number
  canShowLess: boolean
  onShowAll: () => void
  onShowLess: () => void
}

export function ChatListFooter({ hiddenCount, canShowLess, onShowAll, onShowLess }: ChatListFooterProps) {
  return (
    <>
      {hiddenCount > 0 ? (
        <button type="button" className="ml-3 px-2 py-1 text-xs text-foreground/40 transition-colors hover:text-foreground/70" onClick={() => onShowAll()}>
          Show {hiddenCount} more
        </button>
      ) : null}
      {canShowLess ? (
        <button type="button" className="ml-3 px-2 py-1 text-xs text-foreground/40 transition-colors hover:text-foreground/70" onClick={() => onShowLess()}>
          Show less
        </button>
      ) : null}
    </>
  )
}
