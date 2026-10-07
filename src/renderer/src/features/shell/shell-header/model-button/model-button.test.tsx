import { describe, expect, it } from "vitest"
import { ModelButton, type ModelButtonProps } from "@/features/shell/shell-header/model-button/model-button"
import { viewMarkup } from "@/test/view-markup"

const base: ModelButtonProps = {
  name: "Claude Sonnet",
  provider: "openrouter",
  configured: true,
  disabled: false,
  onOpen: () => undefined,
}

describe("ModelButton", () => {
  it("can show the model name", () => {
    const markup = viewMarkup(<ModelButton {...base} />)

    expect(markup).toContain(">Claude Sonnet</span>")
  })

  it("can mark the model button when no provider is connected", () => {
    const markup = viewMarkup(<ModelButton {...base} configured={false} />)

    expect(markup).toContain("bg-warning")
  })

  it("can show no badge when a provider is connected", () => {
    const markup = viewMarkup(<ModelButton {...base} />)

    expect(markup).not.toContain("bg-warning")
  })

  it("can disable the model button", () => {
    const markup = viewMarkup(<ModelButton {...base} disabled />)

    expect(markup).toContain('disabled=""')
  })
})
