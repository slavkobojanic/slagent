import { describe, expect, it } from "vitest"
import { PlanOverlay, type PlanOverlayProps } from "@/features/transcript/plan-overlay/plan-overlay"
import { viewMarkup } from "@/test/view-markup"

const noop = () => undefined

function props(overrides: Partial<PlanOverlayProps> = {}): PlanOverlayProps {
  return { approving: false, onAccept: noop, onRevise: noop, onCancel: noop, ...overrides }
}

describe("PlanOverlay", () => {
  it("offers Cancel, Revise and Accept and build over the blurred chat", () => {
    const markup = viewMarkup(<PlanOverlay {...props()} />)

    expect(markup).toContain('aria-label="Plan ready"')
    expect(markup).toContain("backdrop-blur-md")
    expect(markup).toContain(">Cancel</button>")
    expect(markup).toContain(">Revise</button>")
    expect(markup).toMatch(/<button[^>]*>Accept and build<\/button>/)
    expect(markup).not.toMatch(/disabled=""[^>]*>Accept and build/)
  })

  it("disables Accept and build while the approval is in flight", () => {
    const markup = viewMarkup(<PlanOverlay {...props({ approving: true })} />)

    expect(markup).toMatch(/disabled=""[^>]*>Accept and build<\/button>/)
  })
})