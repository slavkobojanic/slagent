import type { ChatStatus } from "ai"
import { ListChecksIcon, PaperclipIcon } from "lucide-react"
import type { ChangeEvent, ClipboardEvent, ComponentType, DragEvent, FormEvent, KeyboardEvent, SyntheticEvent } from "react"
import { PromptInput, PromptInputBody, PromptInputFooter, PromptInputHeader, PromptInputSubmit, PromptInputTextarea, PromptInputTools } from "@/components/ai-elements/prompt-input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AttachmentChips, type AttachmentChipRow } from "./attachment-chips"
import { PendingComments, type PendingDiffRow, type PendingReplyRow } from "./pending-comments"
import { Suggestions, type SuggestionMenuView } from "./suggestions"

export type ComposerProps = {
  RunStatusBar: ComponentType
  text: string
  placeholder: string
  disabled: boolean
  submitStatus: ChatStatus
  submitDisabled: boolean
  planMode: boolean
  planDisabled: boolean
  attachments: AttachmentChipRow[]
  menu: SuggestionMenuView | null
  activeSuggestion: number
  pendingLabel: string
  pendingReplies: PendingReplyRow[]
  pendingDiffs: PendingDiffRow[]
  attachTextarea: (element: HTMLTextAreaElement | null) => void
  attachFileInput: (element: HTMLInputElement | null) => void
  onTextChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  onSelect: (event: SyntheticEvent<HTMLTextAreaElement>) => void
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  onCompositionStart: () => void
  onCompositionEnd: () => void
  onPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onDragOver: (event: DragEvent<HTMLFormElement>) => void
  onDrop: (event: DragEvent<HTMLFormElement>) => void
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onAttach: () => void
  onTogglePlan: () => void
  onStop: () => void
  onRemoveAttachment: (id: string) => void
  onChoose: (index: number) => void
  onHover: (index: number) => void
  onRemoveReply: (id: string) => void
  onRemoveDiff: (id: string) => void
}

// The prompt box. The run status sits above it, the review comments and the menus follow, then the input itself.
export function Composer({
  RunStatusBar,
  text,
  placeholder,
  disabled,
  submitStatus,
  submitDisabled,
  planMode,
  planDisabled,
  attachments,
  menu,
  activeSuggestion,
  pendingLabel,
  pendingReplies,
  pendingDiffs,
  attachTextarea,
  attachFileInput,
  onTextChange,
  onSelect,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  onPaste,
  onSubmit,
  onDragOver,
  onDrop,
  onFileChange,
  onAttach,
  onTogglePlan,
  onStop,
  onRemoveAttachment,
  onChoose,
  onHover,
  onRemoveReply,
  onRemoveDiff,
}: ComposerProps) {
  return (
    <div className="relative mx-auto w-full max-w-3xl px-6 pb-3">
      <RunStatusBar />
      <PendingComments label={pendingLabel} replies={pendingReplies} diffs={pendingDiffs} onRemoveReply={onRemoveReply} onRemoveDiff={onRemoveDiff} />
      {menu !== null ? <Suggestions menu={menu} active={activeSuggestion} onHover={onHover} onChoose={onChoose} /> : null}
      <input ref={attachFileInput} type="file" multiple aria-label="Upload files" title="Upload files" className="hidden" onChange={onFileChange} />
      <PromptInput onSubmit={onSubmit} onDragOver={onDragOver} onDrop={onDrop}>
        {attachments.length > 0 ? (
          <PromptInputHeader>
            <AttachmentChips items={attachments} onRemove={onRemoveAttachment} />
          </PromptInputHeader>
        ) : null}
        <PromptInputBody>
          <PromptInputTextarea
            ref={attachTextarea}
            name="message"
            value={text}
            placeholder={placeholder}
            disabled={disabled}
            onChange={onTextChange}
            onSelect={onSelect}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onCompositionStart={onCompositionStart}
            onCompositionEnd={onCompositionEnd}
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Attach files" onClick={onAttach}>
              <PaperclipIcon className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 gap-1.5 px-2",
                planMode ? "bg-white/10 text-warning hover:text-warning" : "text-white/60",
              )}
              aria-pressed={planMode}
              title="Plan mode (Shift+Tab): research and propose a plan before changing anything"
              disabled={planDisabled}
              onClick={onTogglePlan}
            >
              <ListChecksIcon className="size-3.5" />
              Plan
            </Button>
          </PromptInputTools>
          <PromptInputSubmit disabled={submitDisabled} status={submitStatus} onStop={onStop} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  )
}
