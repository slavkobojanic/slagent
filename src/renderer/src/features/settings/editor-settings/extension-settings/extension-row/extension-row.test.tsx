import { describe, expect, it, vi } from "vitest"
import { ExtensionRow, type ExtensionRowProps } from "@/features/settings/editor-settings/extension-settings/extension-row/extension-row"
import { viewMarkup } from "@/test/view-markup"

const base: ExtensionRowProps = { id: "redhat.java", version: "1.57.0", enabled: true, busy: false, onToggle: vi.fn(), onUninstall: vi.fn() }

describe("ExtensionRow", () => {
  it("can show the id, version and an enabled switch", () => {
    const markup = viewMarkup(<ExtensionRow {...base} />)

    expect(markup).toContain("redhat.java")
    expect(markup).toContain("Version 1.57.0")
    expect(markup).toMatch(/aria-checked="true"[^>]*aria-label="redhat.java"/)
  })

  it("can show a disabled extension", () => {
    expect(viewMarkup(<ExtensionRow {...base} enabled={false} />)).toMatch(/aria-checked="false"[^>]*aria-label="redhat.java"/)
  })

  it("can offer to uninstall", () => {
    expect(viewMarkup(<ExtensionRow {...base} />)).toContain('aria-label="Uninstall redhat.java"')
  })

  it("can lock both controls while busy", () => {
    const markup = viewMarkup(<ExtensionRow {...base} busy />)

    expect(markup.match(/disabled=""/g)?.length).toBe(2)
  })
})
