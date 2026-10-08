import { describe, expect, it, vi } from "vitest"
import { PromptForm, type PromptFormProps } from "@/features/composer/prompt-form/prompt-form"
import { viewMarkup } from "@/test/view-markup"

function props(overrides: Partial<PromptFormProps> = {}): PromptFormProps {
  return {
    Attachments: () => <i>attachments</i>,
    PromptTextarea: () => <i>textarea</i>,
    AttachButton: () => <i>attach</i>,
    PlanToggle: () => <i>plan</i>,
    SubmitButton: () => <i>submit</i>,
    UsageMeter: () => <i>usage</i>,
    EffortSwitcher: () => <i>effort</i>,
    onSubmit: vi.fn(),
    onDragOver: vi.fn(),
    onDrop: vi.fn(),
    ...overrides,
  }
}

describe("PromptForm", () => {
  it("can lay out the attachments, the textarea, the tools and the submit button in that order", () => {
    const markup = viewMarkup(<PromptForm {...props()} />)

    const order = ["attachments", "textarea", "attach", "plan", "usage", "effort", "submit"].map((name) => markup.indexOf(`<i>${name}</i>`))
    expect(order.every((index) => index >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it("can wrap the box in a form", () => {
    expect(viewMarkup(<PromptForm {...props()} />)).toMatch(/^<form/)
  })
})
