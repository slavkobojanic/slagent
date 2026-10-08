import type { ModelRouting } from "@shared/types"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type ProviderRoutingProps = {
  value: ModelRouting
  error: string | null
  onValueChange: (routing: ModelRouting) => void
}

const OPTIONS: { value: ModelRouting; label: string }[] = [
  { value: "speed", label: "Speed — fastest tokens" },
  { value: "cost", label: "Cost — cheapest" },
  { value: "balance", label: "Balance — let OpenRouter decide" },
]

export function ProviderRouting({ value, error, onValueChange }: ProviderRoutingProps) {
  return (
    <section className="space-y-3 border-t border-white/10 pt-4">
      <div>
        <h2 className="text-sm font-medium">Provider preference</h2>
        <p className="text-xs text-white/50">
          The same model is often served by several providers. Pick what OpenRouter should favour. Claude models are
          unaffected.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="provider-routing">Prefer</Label>
        <Select
          value={value}
          onValueChange={(next) => {
            const option = OPTIONS.find((entry) => entry.value === next)
            if (option) onValueChange(option.value)
          }}
        >
          <SelectTrigger id="provider-routing" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error !== null ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  )
}
