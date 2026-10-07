import type { ComponentType, ReactNode } from "react"
import { observer } from "mobx-react-lite"
import { parseMarkdownIntoBlocks } from "streamdown"
import type { RunStore } from "@/mirror/run-store/run-store"
import { isCodeBlock } from "./reveal-timing"
import { Response } from "./response"
import { ResponsePresenter } from "./response-presenter/response-presenter"
import { ResponseStore } from "./response-store/response-store"

type ResponseHostProps = { messageId: string; text: string; streaming: boolean }

export function createResponse({
  window,
  runStore,
  CommentableResponse,
}: {
  window: Window
  runStore: RunStore
  CommentableResponse: ComponentType<{ messageId: string; children: ReactNode }>
}): ComponentType<ResponseHostProps> {
  const store = new ResponseStore()
  const presenter = new ResponsePresenter(store, runStore, parseMarkdownIntoBlocks, window)
  presenter.start()

  return observer(function ResponseHost({ messageId, text, streaming }: ResponseHostProps) {
    return (
      <Response
        messageId={messageId}
        blocks={parseMarkdownIntoBlocks(text).map((block) => ({ text: block, code: isCodeBlock(block) }))}
        shown={store.shownOf(messageId)}
        streaming={streaming}
        Commentable={CommentableResponse}
      />
    )
  })
}
