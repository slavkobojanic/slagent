import { WifiOff } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import "@/features/mobile/mobile.css"

export type ConnectionBannerProps = {
  online: boolean
  // Whether the Mac answered since launch: a drop after that is a reconnect.
  reached: boolean
  label: string
  onOpen: () => void
}

export function ConnectionBanner({ online, reached, label, onOpen }: ConnectionBannerProps) {
  if (online) {
    return null
  }
  return (
    <button
      type="button"
      className="mobile-banner-in flex w-full items-center gap-2 bg-warning/10 px-4 py-2 text-left text-sm text-foreground/80"
      onClick={onOpen}
    >
      {reached ? <Spinner className="size-4 shrink-0" /> : <WifiOff className="size-4 shrink-0 text-warning" />}
      <span className="min-w-0 flex-1 truncate">{reached ? `Reconnecting to ${label}…` : `Can't reach ${label}`}</span>
      <span className="shrink-0 text-xs text-foreground/50">Settings</span>
    </button>
  )
}
