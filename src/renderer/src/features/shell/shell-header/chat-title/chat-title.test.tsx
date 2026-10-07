import { describe, expect, it } from "vitest"
import { ChatTitle } from "@/features/shell/shell-header/chat-title/chat-title"
import { viewMarkup } from "@/test/view-markup"

describe("ChatTitle", () => {
  it("can show the open chat title after a separator", () => {
    const markup = viewMarkup(<ChatTitle title="Fix the build" />)

    expect(markup).toContain(">/</span>")
    expect(markup).toContain(">Fix the build</span>")
  })

  it("can render nothing for a draft", () => {
    const markup = viewMarkup(<ChatTitle title={null} />)

    expect(markup).toBe("")
  })
})
