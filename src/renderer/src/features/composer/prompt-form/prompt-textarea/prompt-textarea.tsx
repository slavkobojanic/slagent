import type { ChangeEvent, ClipboardEvent, KeyboardEvent, SyntheticEvent } from "react"
import { PromptInputTextarea } from "@/components/ai-elements/prompt-input"

export type PromptTextareaProps = {
  text: string
  placeholder: string
  disabled: boolean
  attach: (element: HTMLTextAreaElement | null) => void
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  onSelect: (event: SyntheticEvent<HTMLTextAreaElement>) => void
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  onPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void
  onCompositionStart: () => void
  onCompositionEnd: () => void
}

export function PromptTextarea({
  text,
  placeholder,
  disabled,
  attach,
  onChange,
  onSelect,
  onKeyDown,
  onPaste,
  onCompositionStart,
  onCompositionEnd,
}: PromptTextareaProps) {
  return (
    <PromptInputTextarea
      ref={attach}
      name="message"
      value={text}
      placeholder={placeholder}
      disabled={disabled}
      onChange={onChange}
      onSelect={onSelect}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      onCompositionStart={onCompositionStart}
      onCompositionEnd={onCompositionEnd}
    />
  )
}
