import type { ComponentType, DragEvent, FormEvent } from "react"
import { PromptInput, PromptInputBody, PromptInputFooter, PromptInputTools } from "@/components/ai-elements/prompt-input"

export type PromptFormProps = {
  Attachments: ComponentType
  PromptTextarea: ComponentType
  AttachButton: ComponentType
  PlanToggle: ComponentType
  SubmitButton: ComponentType
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onDragOver: (event: DragEvent<HTMLFormElement>) => void
  onDrop: (event: DragEvent<HTMLFormElement>) => void
}

export function PromptForm({ Attachments, PromptTextarea, AttachButton, PlanToggle, SubmitButton, onSubmit, onDragOver, onDrop }: PromptFormProps) {
  return (
    <PromptInput onSubmit={onSubmit} onDragOver={onDragOver} onDrop={onDrop}>
      <Attachments />
      <PromptInputBody>
        <PromptTextarea />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTools>
          <AttachButton />
          <PlanToggle />
        </PromptInputTools>
        <SubmitButton />
      </PromptInputFooter>
    </PromptInput>
  )
}
