import { Eye, EyeOff } from "lucide-react"
import type { OpenRouterStatus } from "@shared/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { openRouterLabel } from "@/lib/format"

export type OpenRouterKeyProps = {
  status: OpenRouterStatus
  authFile: string
  apiKey: string
  visible: boolean
  saving: boolean
  removing: boolean
  canSave: boolean
  canRemove: boolean
  error: string | null
  onApiKeyChange: (value: string) => void
  onToggleVisible: () => void
  onCreateKey: () => void
  onSave: () => void
  onRemove: () => void
}

export function OpenRouterKey({
  status,
  authFile,
  apiKey,
  visible,
  saving,
  removing,
  canSave,
  canRemove,
  error,
  onApiKeyChange,
  onToggleVisible,
  onCreateKey,
  onSave,
  onRemove,
}: OpenRouterKeyProps) {
  const inputType = visible ? "text" : "password"
  const visibilityLabel = visible ? "Hide key" : "Show key"
  const saveLabel = saving ? "Saving" : "Save key"
  let removeLabel = "Remove saved key"
  if (status.type === "oauth") {
    removeLabel = "Sign out"
  }
  if (removing) {
    removeLabel = "Removing"
  }

  return (
    <section className="space-y-3 border-t border-white/10 pt-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">OpenRouter</h2>
        <span className="inline-flex items-center gap-1.5 text-xs text-white/70">
          <span data-configured={status.configured} className="size-1.5 rounded-full bg-white/30 data-[configured=true]:bg-success" />
          {openRouterLabel(status)}
        </span>
      </div>
      <p className="text-sm text-white/60">Non-Claude models run through OpenRouter, using the account Pi is signed into.</p>
      {status.envKey ? (
        <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2.5">
          <p className="text-xs text-white/60">
            <span className="font-mono text-white/80">OPENROUTER_API_KEY</span> is set in your environment, so OpenRouter
            already works. Save a key below only to override it.
          </p>
        </div>
      ) : null}
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          onSave()
        }}
      >
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
          {status.type === "oauth" ? (
            <p className="text-xs text-white/45">Saving a key replaces the OpenRouter sign-in stored for Pi.</p>
          ) : null}
        </div>
        {error !== null ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={onCreateKey}>
            Create a key
          </Button>
          <Button type="submit" disabled={!canSave}>
            {saveLabel}
          </Button>
          {canRemove ? (
            <Button
              type="button"
              variant="ghost"
              className="ml-auto text-white/50 hover:text-destructive"
              disabled={removing}
              onClick={onRemove}
            >
              {removeLabel}
            </Button>
          ) : null}
        </div>
      </form>
      <p className="text-xs text-white/35">
        Pi stores credentials at <span className="font-mono break-all text-white/45">{authFile}</span>
      </p>
    </section>
  )
}
