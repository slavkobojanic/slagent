import { describe, expect, it } from "vitest"
import { Message, MessageAction } from "@/components/ai-elements/message"
import { viewMarkup } from "@/test/view-markup"

describe("Message", () => {
  it("marks a user message so its content aligns to the right", () => {
    const markup = viewMarkup(<Message from="user">Hi</Message>)

    expect(markup).toContain("is-user")
  })

  it("labels an icon-only action for screen readers", () => {
    const markup = viewMarkup(
      <MessageAction label="Rewind">
        <span>icon</span>
      </MessageAction>,
    )

    expect(markup).toContain('<span class="sr-only">Rewind</span>')
  })
})
