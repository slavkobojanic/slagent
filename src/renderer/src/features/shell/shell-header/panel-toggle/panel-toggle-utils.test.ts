import { describe, expect, it } from "vitest"
import { panelToggleTitle } from "@/features/shell/shell-header/panel-toggle/panel-toggle-utils"

describe("panelToggleTitle", () => {
  it("can offer to hide the panel while it is open", () => {
    expect(panelToggleTitle(true, "⌘", false)).toBe("Hide panel (⌘⇧D)")
  })

  it("can offer to show the panel while it is closed", () => {
    expect(panelToggleTitle(false, "Ctrl+", false)).toBe("Show panel (Ctrl+⇧D)")
  })

  it("can explain why the panel is unavailable while the editor is open", () => {
    expect(panelToggleTitle(false, "⌘", true)).toBe("The side panel is not available while the editor is open")
  })
})
