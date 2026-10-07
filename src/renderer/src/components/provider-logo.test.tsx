import { describe, expect, it } from "vitest"
import { ProviderLogo } from "@/components/provider-logo"
import { viewMarkup } from "@/test/view-markup"

describe("ProviderLogo", () => {
  it("can draw the Claude Code mark in its brand colour", () => {
    const markup = viewMarkup(<ProviderLogo provider="claude-code" />)

    expect(markup).toContain('aria-label="Claude Code"')
    expect(markup).toContain("claude-brand")
  })

  it("can draw the OpenRouter mark in the text colour", () => {
    const markup = viewMarkup(<ProviderLogo provider="openrouter" />)

    expect(markup).toContain('aria-label="OpenRouter"')
    expect(markup).not.toContain("claude-brand")
  })

  it("can draw nothing without a provider", () => {
    expect(viewMarkup(<ProviderLogo provider={null} />)).toBe("")
  })
})
