import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import type { CommentUnit } from "@/features/transcript/commentable-response/comment-model"
import { CommentableResponse, type CommentableResponseProps } from "@/features/transcript/commentable-response/commentable-response"
import { viewMarkup } from "@/test/view-markup"

function Block({ unit, children }: { unit: CommentUnit; children: ReactNode }) {
  return <div data-unit={unit.block}>{children}</div>
}

function unit(block: string): CommentUnit {
  return { key: `m1\n${block}`, messageId: "m1", block, enabled: true }
}

function props(overrides: Partial<CommentableResponseProps> = {}): CommentableResponseProps {
  return { whole: null, items: [], Block, children: <p>Use a map.</p>, ...overrides }
}

describe("CommentableResponse", () => {
  it("can render a block that is not commentable as it is", () => {
    const markup = viewMarkup(<CommentableResponse {...props()} />)

    expect(markup).toBe("<p>Use a map.</p>")
  })

  it("can wrap a whole block in one commentable unit", () => {
    const markup = viewMarkup(<CommentableResponse {...props({ whole: unit("Use a map.") })} />)

    expect(markup).toBe('<div data-unit="Use a map."><p>Use a map.</p></div>')
  })

  it("can give each item of a finished list its own unit", () => {
    const markup = viewMarkup(<CommentableResponse {...props({ items: [unit("- one"), unit("- two")] })} />)

    expect(markup).toContain('data-unit="- one"')
    expect(markup).toContain('data-unit="- two"')
    expect(markup).not.toContain("Use a map.")
  })
})
