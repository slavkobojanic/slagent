import { describe, expect, it, vi } from "vitest"
import { viewMarkup } from "@/test/view-markup"
import { Composer, type ComposerProps } from "@/features/composer/composer"

function RunStatusStub() {
  return <div data-testid="run-status" />
}

// Every callback is a spy. The view tests only read markup, so none of them are called.
function props(overrides: Partial<ComposerProps> = {}): ComposerProps {
  const spy = vi.fn()
  return {
    RunStatusBar: RunStatusStub,
    text: "",
    placeholder: "Describe a change",
    disabled: false,
    submitStatus: "ready",
    submitDisabled: false,
    planMode: false,
    planDisabled: false,
    attachments: [],
    menu: null,
    activeSuggestion: 0,
    pendingLabel: "",
    pendingReplies: [],
    pendingDiffs: [],
    attachTextarea: spy,
    attachFileInput: spy,
    onTextChange: spy,
    onSelect: spy,
    onKeyDown: spy,
    onCompositionStart: spy,
    onCompositionEnd: spy,
    onPaste: spy,
    onSubmit: spy,
    onDragOver: spy,
    onDrop: spy,
    onFileChange: spy,
    onAttach: spy,
    onTogglePlan: spy,
    onStop: spy,
    onRemoveAttachment: spy,
    onChoose: spy,
    onHover: spy,
    onRemoveReply: spy,
    onRemoveDiff: spy,
    ...overrides,
  }
}

describe("Composer", () => {
  it("can render the idle box with its placeholder and a submit button", () => {
    const markup = viewMarkup(<Composer {...props()} />)

    expect(markup).toContain('placeholder="Describe a change"')
    expect(markup).toContain('aria-label="Submit"')
  })

  it("can render the run status bar above the input", () => {
    const markup = viewMarkup(<Composer {...props()} />)

    expect(markup.indexOf('data-testid="run-status"')).toBeLessThan(markup.indexOf("<textarea"))
  })

  it("can disable the input and the submit button while the box is closed", () => {
    const markup = viewMarkup(<Composer {...props({ disabled: true, submitDisabled: true, placeholder: "Connect OpenRouter to start" })} />)

    expect(markup).toContain("Connect OpenRouter to start")
    expect(markup).toContain('disabled=""')
  })

  it("can show a stop button in place of submit while a run streams", () => {
    const markup = viewMarkup(<Composer {...props({ submitStatus: "streaming" })} />)

    expect(markup).toContain('aria-label="Stop"')
  })

  it("can show the plan toggle as pressed in plan mode", () => {
    const markup = viewMarkup(<Composer {...props({ planMode: true })} />)

    expect(markup).toContain('aria-pressed="true"')
  })

  it("can show the attached files above the input", () => {
    const markup = viewMarkup(<Composer {...props({ attachments: [{ id: "a1", name: "notes.txt", imageUrl: null }] })} />)

    expect(markup).toContain("notes.txt")
  })

  it("can show the @ suggestions above the input", () => {
    const menu = { title: null, empty: null, items: [{ key: "a", label: "@a.ts", detail: "src/a.ts" }] }
    const markup = viewMarkup(<Composer {...props({ menu })} />)

    expect(markup).toContain("@a.ts")
  })

  it("can show the pending review comments above the input", () => {
    const markup = viewMarkup(
      <Composer {...props({ pendingLabel: "1 diff comment", pendingDiffs: [{ id: "d1", location: "a.ts:1", text: "rename" }] })} />,
    )

    expect(markup).toContain("1 diff comment will be sent with your next message")
  })
})
