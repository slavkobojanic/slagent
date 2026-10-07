import type { ComponentType, ReactElement } from "react"
import { parseMarkdownIntoBlocks } from "streamdown"
import type { RewindMode, UserMessage } from "@shared/types"
import { AssistantTurn } from "@/features/transcript/block-row/assistant-turn"
import { UserTurn } from "@/features/transcript/block-row/user-turn"
import { FadingResponse, type CommentableSlot, type ResponsePart } from "@/features/transcript/reveal/fading-response"
import { isCodeBlock } from "@/features/transcript/reveal/reveal-timing"
import { StaticResponse } from "@/features/transcript/reveal/static-response"
import { createToolChain } from "@/features/transcript/tool-chain/create"
import { waitingForText, type Block, type Turn } from "@/features/transcript/transcript-blocks"

// What a row can ask the transcript to do. The owner passes its presenter's methods here.
export type RowActions = {
  onEdit: (messageId: string) => void
  onRewind: (messageId: string, mode: RewindMode) => void
  onOpenFile: (path: string, line?: number) => void
  onConfirmEdit: () => void
  onCancelConfirm: () => void
}

// What the rows read from the transcript's state, already unwrapped by the owner.
export type RowState = {
  streaming: boolean
  // The message being edited, or null. Its editor is EditRow, which reads its own draft.
  editingId: string | null
  EditRow: ComponentType
  confirmingId: string | null
  // How many blocks of a streamed reply are on screen. Undefined for a reply that renders whole.
  shownOf: (messageId: string) => number | undefined
  Commentable: CommentableSlot
  actions: RowActions
}

// Builds the element for one block of the transcript. Each block is either a user message (or
// its editor) or an assistant turn with its tools.
export function createBlockRow({ key, block, state }: { key: string; block: Block; state: RowState }): ReactElement {
  if (block.kind === "user") {
    return createUserRow(key, block.message, state)
  }
  return createTurnRow(key, block.turn, state)
}

function createUserRow(key: string, message: UserMessage, state: RowState): ReactElement {
  const { actions, EditRow } = state
  if (state.editingId === message.id) {
    return <EditRow key={key} />
  }
  return (
    <UserTurn
      key={key}
      message={message}
      editable={!state.streaming && Boolean(message.entryId)}
      confirming={state.confirmingId === message.id}
      onEdit={() => actions.onEdit(message.id)}
      onRewind={(mode) => actions.onRewind(message.id, mode)}
      onOpenFile={actions.onOpenFile}
      onConfirmEdit={actions.onConfirmEdit}
      onCancelConfirm={actions.onCancelConfirm}
    />
  )
}

function createTurnRow(key: string, turn: Turn, state: RowState): ReactElement {
  const assistant = turn.assistant
  const text = assistant && assistant.text ? createResponse(assistant.id, assistant.text, assistant.streaming, state) : null
  return (
    <AssistantTurn
      key={key}
      messageId={turn.id}
      thinking={assistant?.thinking || null}
      thinkingStreaming={assistant?.streaming ?? false}
      tools={createToolChain({ tools: turn.tools, onOpenFile: state.actions.onOpenFile })}
      waiting={waitingForText(assistant, turn.tools)}
      text={text}
      error={assistant?.error ?? null}
    />
  )
}

// A reply's text. A reply that has streamed in this transcript reveals block by block, and any
// other reply renders whole.
function createResponse(messageId: string, text: string, streaming: boolean, state: RowState): ReactElement {
  const blocks: ResponsePart[] = parseMarkdownIntoBlocks(text).map((block) => ({ text: block, code: isCodeBlock(block) }))
  const shown = state.shownOf(messageId)
  if (shown === undefined) {
    return <StaticResponse messageId={messageId} blocks={blocks} Commentable={state.Commentable} />
  }
  return <FadingResponse messageId={messageId} blocks={blocks} shown={shown} streaming={streaming} Commentable={state.Commentable} />
}
