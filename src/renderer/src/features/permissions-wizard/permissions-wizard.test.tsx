import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { PermissionsWizard, type PermissionsWizardProps } from "@/features/permissions-wizard/permissions-wizard"

function AccessibilitySlot() {
  return <p>Accessibility step</p>
}

function ScreenSlot() {
  return <p>Screen step</p>
}

const defaults: PermissionsWizardProps = {
  open: true,
  step: "accessibility",
  AccessibilityStep: AccessibilitySlot,
  ScreenStep: ScreenSlot,
}

describe("PermissionsWizard", () => {
  it("renders nothing while the permissions are granted", () => {
    render(<PermissionsWizard {...defaults} open={false} />)

    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("asks for Accessibility first", () => {
    render(<PermissionsWizard {...defaults} />)

    expect(screen.getByText("Accessibility step")).toBeDefined()
    expect(screen.queryByText("Screen step")).toBeNull()
  })

  it("asks for Screen Recording once Accessibility is granted", () => {
    render(<PermissionsWizard {...defaults} step="screen" />)

    expect(screen.getByText("Screen step")).toBeDefined()
    expect(screen.queryByText("Accessibility step")).toBeNull()
  })
})
