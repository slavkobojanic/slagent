import { useEffect, useRef, useState } from "react"
import { parseMarkdownIntoBlocks } from "streamdown"
import { MessageResponse } from "@/components/ai-elements/message"
import { CommentableResponse, ResponseBlock } from "@/components/response-comments"

const PARAGRAPH_INTERVAL_MS = 220
const wordFade = {
  animation: "fadeIn",
  duration: 180,
  easing: "ease-out",
  sep: "word" as const,
  stagger: 12,
  maxBacklogMs: 180,
}

function blockStart(origin: number, index: number, previousStart: number): number {
  if (index === 0) return origin
  const slot = origin + index * PARAGRAPH_INTERVAL_MS
  const afterPrevious = previousStart + PARAGRAPH_INTERVAL_MS
  if (afterPrevious > slot) return afterPrevious
  return slot
}

function isCodeBlock(block: string): boolean {
  return block.trimStart().startsWith("```")
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function FadingResponse({ messageId, text, streaming }: { messageId: string; text: string; streaming: boolean }) {
  const blocks = parseMarkdownIntoBlocks(text)
  const blocksRef = useRef(blocks)
  blocksRef.current = blocks
  const reduceMotion = useRef(prefersReducedMotion())
  const clock = useRef<{ origin: number; starts: number[]; revealed: number } | null>(null)
  if (!clock.current) {
    const origin = performance.now()
    clock.current = { origin, starts: [origin], revealed: 1 }
  }
  const [shown, setShown] = useState(1)

  useEffect(() => {
    if (reduceMotion.current) return
    const current = clock.current
    if (!current) return
    let timer = 0

    const revealDue = () => {
      const count = blocksRef.current.length
      if (current.revealed >= count) return
      const index = current.revealed
      let previousStart = current.origin
      const prior = current.starts[index - 1]
      if (prior !== undefined) previousStart = prior
      const start = blockStart(current.origin, index, previousStart)
      const now = performance.now()
      if (start > now) {
        timer = window.setTimeout(revealDue, start - now)
        return
      }
      current.starts[index] = now
      current.revealed = index + 1
      setShown(current.revealed)
      if (current.revealed < count) timer = window.setTimeout(revealDue, 0)
    }

    timer = window.setTimeout(revealDue, 0)
    return () => window.clearTimeout(timer)
  }, [blocks.length])

  if (reduceMotion.current) return <CommentableResponse messageId={messageId} text={text} />

  const visible = blocks.slice(0, shown)
  return (
    <div className="space-y-4">
      {visible.map((block, index) => {
        let blockClass: string | undefined
        if (isCodeBlock(block)) blockClass = "reveal-block"
        return (
          <div key={index} className={blockClass}>
            <ResponseBlock messageId={messageId} block={block} streaming={streaming}>
              <MessageResponse
                animated={wordFade}
                className="h-auto"
                isAnimating={streaming}
                mode={streaming ? "streaming" : "static"}
              >
                {block}
              </MessageResponse>
            </ResponseBlock>
          </div>
        )
      })}
    </div>
  )
}

export { FadingResponse }
