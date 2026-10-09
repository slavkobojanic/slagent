import { describe, expect, it, vi } from "vitest"
import { LinkPreferencePicker, type LinkPreferenceOption } from "@/features/settings/link-preference/link-preference"
import { render, screen } from "@testing-library/react"

function renderPicker(value: LinkPreferenceOption) {
  const onChange = vi.fn()
  render(<LinkPreferencePicker value={value} onChange={onChange} />)
  return onChange
}

function checked(label: string): string | null {
  return screen.getByRole("radio", { name: label }).getAttribute("aria-checked")
}

describe("LinkPreferencePicker", () => {
  it("can mark asking every time as the checked choice", () => {
    renderPicker(null)

    expect(checked("Ask every time")).toBe("true")
    expect(checked("Open in browser")).toBe("false")
    expect(checked("Copy to clipboard")).toBe("false")
  })

  it("can mark opening in the browser as the checked choice", () => {
    renderPicker("browser")

    expect(checked("Open in browser")).toBe("true")
    expect(checked("Ask every time")).toBe("false")
  })

  it("can mark copying as the checked choice", () => {
    renderPicker("copy")

    expect(checked("Copy to clipboard")).toBe("true")
    expect(checked("Ask every time")).toBe("false")
  })

  it("reports the picked choice, including asking again", () => {
    const onChange = renderPicker(null)

    screen.getByRole("radio", { name: "Copy to clipboard" }).click()
    screen.getByRole("radio", { name: "Ask every time" }).click()

    expect(onChange).toHaveBeenNthCalledWith(1, "copy")
    expect(onChange).toHaveBeenNthCalledWith(2, null)
  })
})
