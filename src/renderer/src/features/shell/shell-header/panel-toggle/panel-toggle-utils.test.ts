import { describe, expect, it } from "vitest"
import { panelToggleTitle } from "@/features/shell/shell-header/panel-toggle/panel-toggle-utils"

describe("panelToggleTitle", () => {
  it("can offer to hide the panel while it is open", () => {
    expect(panelToggleTitle(true, "⌘")).toBe("Hide panel (⌘⇧D)")
  })

  it("can offer to show the panel while it is closed", () => {
    expect(panelToggleTitle(false, "Ctrl+")).toBe("Show panel (Ctrl+⇧D)")
  })
})
