import { Input } from "@/components/ui/input"
import { Marker } from "@/features/transcript/question-card/question-block/marker"
import { cn } from "@/lib/utils"

export type OtherRowProps = {
  multiSelect: boolean
  optionCount: number
  other: string
  onChange: (value: string) => void
}

// On single-choice questions, typing here clears the pick. Enter is handled by the card, which
// owns every key press in it.
export function OtherRow({ multiSelect, optionCount, other, onChange }: OtherRowProps) {
  const filled = other.trim() !== ""
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-white/10 py-1.5 pr-3.5 pl-3.5 transition-colors hover:bg-white/4 focus-within:border-white/40",
        filled && "border-white/70 bg-white/6 hover:bg-white/6",
      )}
    >
      <span className="shrink-0 text-sm font-medium">Other</span>
      <Input
        value={other}
        placeholder={multiSelect ? "Type your own answer (optional)" : "Type your own answer"}
        className="h-8 min-w-0 flex-1 border-0 px-0 text-sm focus-visible:ring-0"
        onChange={(event) => onChange(event.target.value)}
      />
      {multiSelect ? null : <Marker checked={filled} index={optionCount} />}
    </div>
  )
}
