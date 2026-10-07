import type { ComponentType, ReactNode } from "react"
import { FadingResponse, type ResponsePart } from "./fading-response"
import { StaticResponse } from "./static-response"

export type ResponseProps = {
  messageId: string
  blocks: ResponsePart[]
  // How many blocks are on screen, or undefined for a reply that did not stream here and renders whole.
  shown: number | undefined
  streaming: boolean
  Commentable: ComponentType<{ messageId: string; children: ReactNode }>
}

export function Response({ messageId, blocks, shown, streaming, Commentable }: ResponseProps) {
  if (shown === undefined) {
    return <StaticResponse messageId={messageId} blocks={blocks} Commentable={Commentable} />
  }
  return <FadingResponse messageId={messageId} blocks={blocks} shown={shown} streaming={streaming} Commentable={Commentable} />
}
