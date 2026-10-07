import { CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type MarkerProps = {
  checked: boolean
  index: number
}

export function Marker({ checked, index }: MarkerProps) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-md bg-white/8 text-xs tabular-nums text-white/50 transition-colors",
        checked && "bg-white text-black",
      )}
    >
      {checked ? <CheckIcon className="size-3" strokeWidth={2.5} /> : index + 1}
    </span>
  )
}
