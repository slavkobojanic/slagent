import type { ReactNode } from "react"

export type CommentableBlockProps = {
  // Also measures the highlights inside the body.
  wrapperRef: (element: HTMLElement | null) => void
  // Mouse handlers receive the wrapper, so the presenter knows which rendered unit the pointer is on.
  onMouseUp: (wrapper: HTMLElement) => void
  onMouseMove: (wrapper: HTMLElement, x: number, y: number) => void
  onMouseLeave: () => void
  children: ReactNode
}

export function CommentableBlock({ wrapperRef, onMouseUp, onMouseMove, onMouseLeave, children }: CommentableBlockProps) {
  return (
    <div
      ref={wrapperRef}
      className="group/reply relative"
      onMouseUp={(event) => onMouseUp(event.currentTarget)}
      onMouseMove={(event) => onMouseMove(event.currentTarget, event.clientX, event.clientY)}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  )
}
