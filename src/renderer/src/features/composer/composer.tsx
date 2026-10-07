import type { ComponentType } from "react"

export type ComposerProps = {
  RunStatus: ComponentType
  PendingComments: ComponentType
  PromptHistory: ComponentType
  Suggestions: ComponentType
  FileInput: ComponentType
  PromptForm: ComponentType
}

export function Composer({ RunStatus, PendingComments, PromptHistory, Suggestions, FileInput, PromptForm }: ComposerProps) {
  return (
    <div className="relative mx-auto w-full max-w-3xl px-6 pb-3">
      <RunStatus />
      <PendingComments />
      <PromptHistory />
      <Suggestions />
      <FileInput />
      <PromptForm />
    </div>
  )
}
