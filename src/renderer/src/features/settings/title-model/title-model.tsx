import type { TitleModelOption } from "@shared/types"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type TitleModelProps = {
  models: TitleModelOption[]
  value: string | null
  error: string | null
  onValueChange: (modelId: string) => void
}

export function TitleModel({ models, value, error, onValueChange }: TitleModelProps) {
  return (
    <section className="space-y-3 border-t border-white/10 pt-4">
      <div>
        <h2 className="text-sm font-medium">Chat naming</h2>
        <p className="text-xs text-white/50">
          A small, cheap model names each chat from its first exchange, so naming never spends the model you chat with.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="title-model">Naming model</Label>
        <Select value={value ?? ""} onValueChange={onValueChange}>
          <SelectTrigger id="title-model" className="w-full">
            <SelectValue placeholder="Default" />
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.name}
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
