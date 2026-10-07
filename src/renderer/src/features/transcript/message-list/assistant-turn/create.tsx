import type { ComponentType, ReactNode } from "react"
import { observer } from "mobx-react-lite"
import type { RunStore } from "@/mirror/run-store/run-store"
import { waitingForText, type Turn } from "@/features/transcript/transcript-blocks"
import type { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import { AssistantTurn } from "./assistant-turn"
import { createResponse } from "./response/create"
import { createToolChain } from "./tool-chain/create"

export function createAssistantTurn({
  window,
  runStore,
  panelPresenter,
  CommentableResponse,
}: {
  window: Window
  runStore: RunStore
  panelPresenter: PanelPresenter
  CommentableResponse: ComponentType<{ messageId: string; children: ReactNode }>
}): ComponentType<{ turn: Turn }> {
  const Response = createResponse({ window, runStore, CommentableResponse })
  const ToolChain = createToolChain({ panelPresenter })

  return observer(function AssistantTurnHost({ turn }: { turn: Turn }) {
    const assistant = turn.assistant
    return (
      <AssistantTurn
        messageId={turn.id}
        thinking={assistant?.thinking || null}
        thinkingStreaming={assistant?.streaming ?? false}
        tools={<ToolChain tools={turn.tools} />}
        waiting={waitingForText(assistant, turn.tools)}
        text={assistant?.text ? <Response messageId={assistant.id} text={assistant.text} streaming={assistant.streaming} /> : null}
        error={assistant?.error ?? null}
      />
    )
  })
}
