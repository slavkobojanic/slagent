import { cn } from "@/lib/utils"

export type SettingSwitchProps = {
  label: string
  description?: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}

export function SettingSwitch({ label, description, checked, disabled = false, onChange }: SettingSwitchProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <div className="min-w-0">
        <div className="text-sm">{label}</div>
        {description ? <div className="text-xs text-white/50">{description}</div> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        className="flex h-5 w-9 shrink-0 items-center rounded-full bg-white/15 px-0.5 transition-colors aria-checked:bg-white/70 disabled:opacity-50"
        onClick={() => onChange(!checked)}
      >
        <span className={cn("size-4 rounded-full bg-background transition-transform", checked ? "translate-x-4" : "translate-x-0")} />
      </button>
    </div>
  )
}
