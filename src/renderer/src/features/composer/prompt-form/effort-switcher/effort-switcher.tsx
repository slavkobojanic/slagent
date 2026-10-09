import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BrainIcon } from "lucide-react"
import type { EffortLevel } from "@shared/types"
import { cn } from "@/lib/utils"

export const EFFORT_OPTIONS: { value: EffortLevel; label: string; hint: string }[] = [
  { value: "minimal", label: "Minimal", hint: "Barely thinks" },
  { value: "low", label: "Low", hint: "Light reasoning" },
  { value: "medium", label: "Medium", hint: "Default" },
  { value: "high", label: "High", hint: "Thorough" },
  { value: "xhigh", label: "X-High", hint: "Very thorough" },
  { value: "max", label: "Max", hint: "Deepest reasoning" },
]

export type EffortSwitcherProps = {
  effort: EffortLevel
  onValueChange: (effort: EffortLevel) => void
}

export function EffortSwitcher({ effort, onValueChange }: EffortSwitcherProps) {
  const current = EFFORT_OPTIONS.find((option) => option.value === effort) ?? EFFORT_OPTIONS[2]!
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-white/60 hover:bg-white/10"
          aria-label={`Reasoning effort: ${current.label}`}
          title="How hard the model reasons before answering"
        >
          <BrainIcon className="size-3.5" />
          {current.label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="font-normal">Reasoning effort</DropdownMenuLabel>
        {EFFORT_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            className={cn("justify-between", option.value === effort && "bg-white/10")}
            onClick={() => onValueChange(option.value)}
          >
            <span>{option.label}</span>
            <span className="text-xs text-white/40">{option.hint}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}