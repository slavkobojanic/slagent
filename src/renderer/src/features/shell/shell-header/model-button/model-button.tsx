import { ProviderLogo } from "@/components/provider-logo"
import { Button } from "@/components/ui/button"
import type { ModelProvider } from "@shared/types"

export type ModelButtonProps = {
  name: string
  provider: ModelProvider | null
  // False when no provider is connected. The button then shows a badge.
  configured: boolean
  disabled: boolean
  onOpen: () => void
}

export function ModelButton({ name, provider, configured, disabled, onOpen }: ModelButtonProps) {
  return (
    <Button type="button" variant="ghost" className="relative max-w-56" disabled={disabled} onClick={onOpen}>
      <ProviderLogo provider={provider} />
      <span className="truncate">{name}</span>
      {configured ? null : <span aria-hidden="true" className="absolute right-1 top-1 size-1.5 rounded-full bg-warning" />}
    </Button>
  )
}
