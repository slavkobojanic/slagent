import { ChevronDown } from "lucide-react"
import type { ServerAddress } from "@/lib/server-address"
import { addressLabel } from "@/lib/server-address"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export type MacPickerProps = {
  label: string
  online: boolean
  servers: ServerAddress[]
  // The Mac the phone is connected to right now, matched without its token.
  current: ServerAddress | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (address: ServerAddress) => void
}

// The connected computer, shown beneath the chats title as a quiet grey pill
// with a chevron. Its dropdown lists every Mac this phone has connected to;
// the active one is marked, and picking another boots the app against it.
export function MacPicker({ label, online, servers, current, open, onOpenChange, onPick }: MacPickerProps) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="mobile-press inline-flex max-w-full items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs text-foreground/60"
          aria-label={`Connected to ${label}, switch computer`}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="size-3 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {servers.map((address) => {
          const active = current !== null && address.host === current.host && address.port === current.port
          return (
            <DropdownMenuItem key={`${address.host}:${address.port}`} className="items-start gap-2 py-2" onSelect={() => onPick(address)}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{addressLabel(address)}</p>
                <p className="truncate font-mono text-xs text-white/50">
                  {address.host}:{address.port}
                </p>
              </div>
              {active ? (
                <span className="flex shrink-0 items-center gap-1.5 pt-0.5 text-xs text-foreground/60">
                  <span className={cn("size-1.5 rounded-full", online ? "bg-success" : "bg-warning")} />
                  Active
                </span>
              ) : null}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
