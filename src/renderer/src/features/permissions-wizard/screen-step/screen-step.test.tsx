import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { ScreenStep, type ScreenStepProps } from "@/features/permissions-wizard/screen-step/screen-step"

const defaults: ScreenStepProps = {
  pane: "Screen Recording",
  error: null,
  canAllow: true,
  onOpenSettings: () => undefined,
  onAllow: () => undefined,
}

// The step renders inside the wizard's dialog, which Radix needs for the title.
function renderStep(overrides: Partial<ScreenStepProps> = {}) {
  return render(
    <Dialog open>
      <DialogContent>
        <ScreenStep {...defaults} {...overrides} />
      </DialogContent>
    </Dialog>,
  )
}

describe("ScreenStep", () => {
  it("asks for the pane as step 2 of 2", () => {
    renderStep()

    expect(screen.getByRole("heading", { name: "Allow Screen Recording" })).toBeDefined()
    expect(screen.getByText("Step 2 of 2. slagent stays locked until this is allowed.")).toBeDefined()
  })

  it("keeps the allow button off while a request runs", () => {
    renderStep({ canAllow: false })

    expect((screen.getByRole("button", { name: "Allow Screen Recording" }) as HTMLButtonElement).disabled).toBe(true)
  })
})
