import { describe, expect, it } from "vitest"
import { PanelToggle, type PanelToggleProps } from "@/features/shell/shell-header/panel-toggle/panel-toggle"
import { viewMarkup } from "@/test/view-markup"

const base: PanelToggleProps = {
  open: false,
  title: "Show panel (⌘⇧D)",
  disabled: false,
  onToggle: () => undefined,
}

describe("PanelToggle", () => {
  it("can mark the panel button as pressed while the panel is open", () => {
    const markup = viewMarkup(<PanelToggle {...base} open />)

    expect(markup).toContain('aria-pressed="true"')
    expect(markup).toContain('aria-label="Hide panel"')
  })

  it("can offer to show the panel while it is closed", () => {
    const markup = viewMarkup(<PanelToggle {...base} />)

    expect(markup).toContain('aria-pressed="false"')
    expect(markup).toContain('aria-label="Show panel"')
  })

  it("can disable the panel button until a folder is open", () => {
    const markup = viewMarkup(<PanelToggle {...base} disabled />)

    expect(markup).toContain('disabled=""')
  })
})
