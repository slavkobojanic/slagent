import { Eye, EyeOff } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type KeyFieldProps = {
  apiKey: string
  visible: boolean
  oauth: boolean
  onApiKeyChange: (value: string) => void
  onToggleVisible: () => void
}

export function KeyField({ apiKey, visible, oauth, onApiKeyChange, onToggleVisible }: KeyFieldProps) {
  const inputType = visible ? "text" : "password"
  const visibilityLabel = visible ? "Hide key" : "Show key"

  return (
    <div className="space-y-2">
      <Label htmlFor="openrouter-key">API key</Label>
      <div className="relative">
        <Input
          id="openrouter-key"
          type={inputType}
          value={apiKey}
          autoComplete="off"
          spellCheck={false}
          placeholder="sk-or-..."
          className="pr-10"
          onChange={(event) => onApiKeyChange(event.target.value)}
        />
        <button
          type="button"
          aria-label={visibilityLabel}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
          onClick={onToggleVisible}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {oauth ? <p className="text-xs text-white/45">Saving a key replaces the OpenRouter sign-in stored for Pi.</p> : null}
    </div>
  )
}
