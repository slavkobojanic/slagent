import { describe, expect, it } from "vitest"
import { EmptyState, type EmptyStateProps } from "@/features/transcript/message-list/empty-state/empty-state"
import { viewMarkup } from "@/test/view-markup"

const noop = () => undefined

function props(overrides: Partial<EmptyStateProps> = {}): EmptyStateProps {
  return { configured: true, cwd: "/work/app", onConnect: noop, onChoose: noop, ...overrides }
}

describe("EmptyState", () => {
  it("asks for a folder when no folder is open", () => {
    const markup = viewMarkup(<EmptyState {...props({ cwd: "" })} />)

    expect(markup).toContain("Choose a folder")
    expect(markup).toContain("Choose folder")
  })

  it("asks for a model connection when the folder has none", () => {
    const markup = viewMarkup(<EmptyState {...props({ configured: false })} />)

    expect(markup).toContain("Connect OpenRouter")
    expect(markup).toContain("Add API key")
  })

  it("invites the first request in the open folder once a model is connected", () => {
    const markup = viewMarkup(<EmptyState {...props()} />)

    expect(markup).toContain("Ask for a change in this folder")
    expect(markup).toContain("/work/app")
  })
})
