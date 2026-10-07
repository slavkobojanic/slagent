import type { ChatStatus } from "ai"
import { PromptInputSubmit } from "@/components/ai-elements/prompt-input"

export type SubmitButtonProps = {
  status: ChatStatus
  disabled: boolean
  onStop: () => void
}

export function SubmitButton({ status, disabled, onStop }: SubmitButtonProps) {
  return <PromptInputSubmit disabled={disabled} status={status} onStop={onStop} />
}
