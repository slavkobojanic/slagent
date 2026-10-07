import { describe, expect, it } from "vitest"
import { PlanDocument } from "./plan-document"
import { viewMarkup } from "@/test/view-markup"

describe("PlanDocument", () => {
  it("can show the plan as markdown in a labelled, scrollable region", () => {
    const markup = viewMarkup(<PlanDocument plan={"# Plan\n\n- Read the parser\n- Add the test"} />)

    expect(markup).toContain('aria-label="Plan document"')
    expect(markup).toContain("overflow-y-auto")
    expect(markup).toContain("Read the parser")
  })
})
