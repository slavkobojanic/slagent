import { ChevronLeft } from "lucide-react"

export type BackSwipeProps = {
  progress: number
}

// The edge pill that follows the finger during a back swipe. progress comes
// straight from the touch, so the pill has no transition of its own.
export function BackSwipe({ progress }: BackSwipeProps) {
  if (progress === 0) {
    return null
  }
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-1.5 top-1/2 z-50 flex size-8 items-center justify-center rounded-full bg-foreground/10 text-foreground/60"
      style={{ opacity: progress, transform: `translateY(-50%) translateX(${(progress - 1) * 12}px)` }}
    >
      <ChevronLeft className="size-5" />
    </div>
  )
}
