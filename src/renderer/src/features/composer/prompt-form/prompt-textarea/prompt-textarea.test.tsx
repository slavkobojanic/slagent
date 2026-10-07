import { describe, expect, it, vi } from "vitest"
import { PromptTextarea, type PromptTextareaProps } from "@/features/composer/prompt-form/prompt-textarea/prompt-textarea"
import { viewMarkup } from "@/test/view-markup"

function props(overrides: Partial<PromptTextareaProps> = {}): PromptTextareaProps {
  const spy = vi.fn()
  return {
    text: "",
    placeholder: "Describe a change",
    disabled: false,
    attach: spy,
    onChange: spy,
    onSelect: spy,
    onKeyDown: spy,
    onPaste: spy,
    onCompositionStart: spy,
    onCompositionEnd: spy,
    ...overrides,
  }
}

describe("PromptTextarea", () => {
  it("can render the text with its placeholder", () => {
    const markup = viewMarkup(<PromptTextarea {...props({ text: "hello" })} />)

    expect(markup).toContain('placeholder="Describe a change"')
    expect(markup).toContain(">hello</textarea>")
  })

  it("can disable the box while it is closed", () => {
    const markup = viewMarkup(<PromptTextarea {...props({ disabled: true, placeholder: "Connect OpenRouter to start" })} />)

    expect(markup).toContain("Connect OpenRouter to start")
    expect(markup).toContain('disabled=""')
  })
})
