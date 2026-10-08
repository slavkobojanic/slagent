import { describe, expect, it } from "vitest"
import { SettingsButton } from "@/features/shell/shell-header/settings-button/settings-button"
import { viewMarkup } from "@/test/view-markup"

const noop = () => undefined

describe("SettingsButton", () => {
  it("can mark the settings button when an MCP server needs sign-in", () => {
    const markup = viewMarkup(<SettingsButton needsAuth onOpen={noop} />)

    expect(markup).toContain("bg-warning")
  })

  it("can show no badge when no MCP server needs sign-in", () => {
    const markup = viewMarkup(<SettingsButton needsAuth={false} onOpen={noop} />)

    expect(markup).not.toContain("bg-warning")
  })
})
