import type { ComponentType } from "react"
import type { OpenRouterStatus } from "@shared/types"
import { Card } from "@/components/ui/card"
import { openRouterLabel } from "@/lib/format"

export type OpenRouterKeyProps = {
  status: OpenRouterStatus
  authFile: string
  error: string | null
  onSave: () => void
  KeyField: ComponentType
  KeyActions: ComponentType
}

export function OpenRouterKey({ status, authFile, error, onSave, KeyField, KeyActions }: OpenRouterKeyProps) {
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
        <Card>
          <p className="text-xs text-white/60">
            <span className="font-mono text-white/80">OPENROUTER_API_KEY</span> is set in your environment, so OpenRouter
            already works. Save a key below only to override it.
          </p>
        </Card>
      ) : null}
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          onSave()
        }}
      >
        <KeyField />
        {error !== null ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <KeyActions />
      </form>
      <p className="text-xs text-white/35">
        Pi stores credentials at <span className="font-mono break-all text-white/45">{authFile}</span>
      </p>
    </section>
  )
}
