import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { ThemePicker, type ThemeOption } from "@/features/settings/theme-picker/theme-picker"

function renderPicker(value: ThemeOption) {
  return render(<ThemePicker value={value} onChange={() => undefined} />)
}

function checked(label: string): string | null {
  return screen.getByRole("radio", { name: label }).getAttribute("aria-checked")
}

describe("ThemePicker", () => {
  it("can mark the system theme as the checked choice", () => {
    renderPicker("system")

    expect(checked("System")).toBe("true")
    expect(checked("Light")).toBe("false")
    expect(checked("Dark")).toBe("false")
  })

  it("can mark the light theme as the checked choice", () => {
    renderPicker("light")

    expect(checked("System")).toBe("false")
    expect(checked("Light")).toBe("true")
  })

  it("can mark the dark theme as the checked choice", () => {
    renderPicker("dark")

    expect(checked("Dark")).toBe("true")
    expect(checked("Light")).toBe("false")
  })
})
