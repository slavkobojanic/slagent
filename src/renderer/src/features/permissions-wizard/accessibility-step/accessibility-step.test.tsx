import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { AccessibilityStep, type AccessibilityStepProps } from "@/features/permissions-wizard/accessibility-step/accessibility-step"

const defaults: AccessibilityStepProps = {
  pane: "Accessibility",
  error: null,
  canAllow: true,
  onOpenSettings: () => undefined,
  onAllow: () => undefined,
}

// The step renders inside the wizard's dialog, which Radix needs for the title.
function renderStep(overrides: Partial<AccessibilityStepProps> = {}) {
  return render(
    <Dialog open>
      <DialogContent>
        <AccessibilityStep {...defaults} {...overrides} />
      </DialogContent>
    </Dialog>,
  )
}

describe("AccessibilityStep", () => {
  it("asks for the pane as step 1 of 2", () => {
    renderStep()

    expect(screen.getByRole("heading", { name: "Allow Accessibility" })).toBeDefined()
    expect(screen.getByText("Step 1 of 2. slagent stays locked until this is allowed.")).toBeDefined()
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("shows the error from the permission check", () => {
    renderStep({ error: "Screen Recording could not be read." })

    expect(screen.getByRole("alert").textContent).toBe("Screen Recording could not be read.")
  })

  it("keeps the allow button off until the permissions are known", () => {
    renderStep({ canAllow: false })

    expect((screen.getByRole("button", { name: "Allow Accessibility" }) as HTMLButtonElement).disabled).toBe(true)
  })
})
