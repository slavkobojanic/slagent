import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { ProjectAppearanceProps } from "@/features/library/project-appearance/project-appearance"
import { ProjectAppearance } from "@/features/library/project-appearance/project-appearance"

function base(overrides: Partial<ProjectAppearanceProps> = {}): ProjectAppearanceProps {
  return {
    open: true,
    projectName: "Atlas",
    icon: null,
    color: null,
    busy: false,
    error: null,
    onIcon: () => undefined,
    onColor: () => undefined,
    onCancel: () => undefined,
    onConfirm: () => undefined,
    ...overrides,
  }
}

describe("ProjectAppearance", () => {
  it("can show the picker for a project", () => {
    render(<ProjectAppearance {...base()} />)

    expect(screen.queryByRole("heading", { name: "Customise Atlas" })).not.toBeNull()
    expect(screen.queryByRole("button", { name: "Launch" })).not.toBeNull()
    expect(screen.queryByRole("button", { name: "Blue" })).not.toBeNull()
  })

  it("can mark the current icon and colour as pressed", () => {
    render(<ProjectAppearance {...base({ icon: "rocket", color: "blue" })} />)

    expect(screen.queryByRole("button", { name: "Launch" })?.getAttribute("aria-pressed")).toBe("true")
    expect(screen.queryByRole("button", { name: "Blue" })?.getAttribute("aria-pressed")).toBe("true")
    expect(screen.queryByRole("button", { name: "Red" })?.getAttribute("aria-pressed")).toBe("false")
  })

  it("can show the selected preview", () => {
    render(<ProjectAppearance {...base({ icon: "rocket", color: "blue" })} />)

    expect(screen.queryByText("Launch · Blue")).not.toBeNull()
  })

  it("can keep the save action disabled while busy", () => {
    render(<ProjectAppearance {...base({ busy: true })} />)

    const action = screen.getByRole("button", { name: "Saving…" })

    expect(action.hasAttribute("disabled")).toBe(true)
  })

  it("can show a save failure", () => {
    render(<ProjectAppearance {...base({ error: "Unknown icon." })} />)

    expect(screen.queryByText("Unknown icon.")).not.toBeNull()
  })
})
