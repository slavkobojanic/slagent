import { describe, expect, it } from "vitest"
import { viewMarkup } from "@/test/view-markup"
import { Composer, type ComposerProps } from "@/features/composer/composer"

function props(): ComposerProps {
  return {
    RunStatus: () => <i>run-status</i>,
    PendingComments: () => <i>pending-comments</i>,
    PromptHistory: () => <i>prompt-history</i>,
    Suggestions: () => <i>suggestions</i>,
    FileInput: () => <i>file-input</i>,
    PromptForm: () => <i>prompt-form</i>,
  }
}

describe("Composer", () => {
  it("can stack the run status, the pending comments and the menu above the prompt form", () => {
    const markup = viewMarkup(<Composer {...props()} />)

    const order = ["run-status", "pending-comments", "prompt-history", "suggestions", "file-input", "prompt-form"].map((name) => markup.indexOf(`<i>${name}</i>`))
    expect(order.every((index) => index >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })
})
