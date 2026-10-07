import { describe, expect, it } from "vitest"
import { PlanCard, type PlanCardProps } from "@/features/transcript/plan-card/plan-card"
import { viewMarkup } from "@/test/view-markup"

const noop = () => undefined

function props(overrides: Partial<PlanCardProps> = {}): PlanCardProps {
  return { plan: "1. Read the code", approving: false, onApprove: noop, ...overrides }
}

describe("PlanCard", () => {
  it("shows the proposed plan with Approve enabled", () => {
    const markup = viewMarkup(<PlanCard {...props()} />)

    expect(markup).toContain("Proposed plan")
    expect(markup).toContain("Read the code")
    expect(markup).toMatch(/<button[^>]*>Approve and build<\/button>/)
    expect(markup).not.toMatch(/disabled=""[^>]*>Approve and build/)
  })

  it("disables Approve while the approval is in flight", () => {
    const markup = viewMarkup(<PlanCard {...props({ approving: true })} />)

    expect(markup).toMatch(/disabled=""[^>]*>Approve and build/)
  })
})
