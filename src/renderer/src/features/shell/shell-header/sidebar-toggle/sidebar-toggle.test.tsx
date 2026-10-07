import { describe, expect, it } from "vitest"
import { SidebarToggle } from "@/features/shell/shell-header/sidebar-toggle/sidebar-toggle"
import { viewMarkup } from "@/test/view-markup"

const noop = () => undefined

describe("SidebarToggle", () => {
  it("can offer to hide the sidebar and show as pressed while it is open", () => {
    const markup = viewMarkup(<SidebarToggle open title="Hide sidebar (⌘B)" onToggle={noop} />)

    expect(markup).toContain('aria-label="Hide sidebar"')
    expect(markup).toContain('aria-pressed="true"')
    expect(markup).toContain('title="Hide sidebar (⌘B)"')
  })

  it("can offer to show the sidebar while it is closed", () => {
    const markup = viewMarkup(<SidebarToggle open={false} title="Show sidebar (⌘B)" onToggle={noop} />)

    expect(markup).toContain('aria-label="Show sidebar"')
    expect(markup).toContain('aria-pressed="false"')
  })
})
