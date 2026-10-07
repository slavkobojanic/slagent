import { describe, expect, it } from "vitest"
import { sidebarToggleTitle } from "@/features/shell/shell-header/sidebar-toggle/sidebar-toggle-utils"

describe("sidebarToggleTitle", () => {
  it("can offer to hide the sidebar while it is open", () => {
    expect(sidebarToggleTitle(true, "⌘")).toBe("Hide sidebar (⌘B)")
  })

  it("can offer to show the sidebar while it is closed", () => {
    expect(sidebarToggleTitle(false, "Ctrl+")).toBe("Show sidebar (Ctrl+B)")
  })
})
