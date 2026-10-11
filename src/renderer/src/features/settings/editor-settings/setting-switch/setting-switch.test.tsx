import { describe, expect, it, vi } from "vitest"
import { SettingSwitch, type SettingSwitchProps } from "@/features/settings/editor-settings/setting-switch/setting-switch"
import { viewMarkup } from "@/test/view-markup"

const base: SettingSwitchProps = { label: "Word wrap", checked: false, onChange: vi.fn() }

describe("SettingSwitch", () => {
  it("can show its label and an off switch", () => {
    const markup = viewMarkup(<SettingSwitch {...base} />)

    expect(markup).toContain("Word wrap")
    expect(markup).toContain('aria-checked="false"')
  })

  it("can show an on switch", () => {
    expect(viewMarkup(<SettingSwitch {...base} checked />)).toContain('aria-checked="true"')
  })

  it("can show a description under the label", () => {
    expect(viewMarkup(<SettingSwitch {...base} description="Wrap long lines." />)).toContain("Wrap long lines.")
  })

  it("can disable the switch", () => {
    expect(viewMarkup(<SettingSwitch {...base} disabled />)).toContain("disabled")
  })
})
