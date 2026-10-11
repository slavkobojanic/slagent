import { describe, expect, it, vi } from "vitest"
import { viewMarkup } from "@/test/view-markup"
import { ChangesTabs, type ChangesTabsProps } from "./changes-tabs"

function tabs(overrides: Partial<ChangesTabsProps> = {}): ChangesTabsProps {
  return {
    showing: "changes",
    hasPlan: false,
    onTab: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  }
}

describe("ChangesTabs", () => {
  it("can select the changes tab with no plan tab", () => {
    const markup = viewMarkup(<ChangesTabs {...tabs()} />)

    expect(markup).toMatch(/role="tab"[^>]*aria-selected="true"[^>]*>(?:(?!<\/button>).)*Changes/)
    expect(markup).not.toContain("Plan")
    expect(markup).toContain('aria-label="Close side panel"')
  })

  it("can show the plan tab when the run has a plan, and select it while the plan shows", () => {
    const markup = viewMarkup(<ChangesTabs {...tabs({ showing: "plan", hasPlan: true })} />)

    expect(markup).toMatch(/role="tab"[^>]*aria-selected="true"[^>]*>(?:(?!<\/button>).)*Plan/)
  })
})
