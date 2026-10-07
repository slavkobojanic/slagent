import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { PermissionsWizard, type PermissionsWizardProps } from "@/features/models/permissions-wizard/permissions-wizard"

const defaults: PermissionsWizardProps = {
  open: true,
  step: "accessibility",
  accessibilityPane: "Accessibility",
  screenPane: "Screen Recording",
  error: null,
  canAllowAccessibility: true,
  canAllowScreenRecording: true,
  onOpenSettings: () => undefined,
  onAllowAccessibility: () => undefined,
  onAllowScreenRecording: () => undefined,
}

describe("PermissionsWizard", () => {
  it("renders nothing while the permissions are granted", () => {
    render(<PermissionsWizard {...defaults} open={false} />)

    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("asks for Accessibility first", () => {
    render(<PermissionsWizard {...defaults} />)

    expect(screen.getByRole("heading", { name: "Allow Accessibility" })).toBeDefined()
    expect(screen.getByText("Step 1 of 2. slagent stays locked until this is allowed.")).toBeDefined()
  })

  it("asks for Screen Recording once Accessibility is granted", () => {
    render(<PermissionsWizard {...defaults} step="screen" screenPane="Screen Recording" />)

    expect(screen.getByRole("heading", { name: "Allow Screen Recording" })).toBeDefined()
    expect(screen.getByText("Step 2 of 2. slagent stays locked until this is allowed.")).toBeDefined()
  })

  it("shows the error from the permission check", () => {
    render(<PermissionsWizard {...defaults} error="Screen Recording could not be read." />)

    expect(screen.getByRole("alert").textContent).toBe("Screen Recording could not be read.")
  })

  it("keeps the Accessibility button off until the permissions are known", () => {
    render(<PermissionsWizard {...defaults} canAllowAccessibility={false} />)

    expect((screen.getByRole("button", { name: "Allow Accessibility" }) as HTMLButtonElement).disabled).toBe(true)
  })
})
