import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DEFAULT } from "./choice-value"

export type ChoiceSelectProps = {
  value: string | null
  onValueChange: (value: string) => void
  options: { value: string; label: string }[]
}

export function ChoiceSelect({ value, onValueChange, options }: ChoiceSelectProps) {
  return (
    <Select value={value ?? DEFAULT} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={DEFAULT}>Default</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
