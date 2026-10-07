import { describe, expect, it } from "vitest"
import { RowMenu } from "@/features/library/sidebar/row-menu"
import { viewMarkup } from "@/test/view-markup"

describe("RowMenu", () => {
  it("can label its trigger for the row it belongs to", () => {
    const html = viewMarkup(
      <RowMenu label="Launch notes actions">
        <span>item</span>
      </RowMenu>,
    )

    expect(html).toContain('aria-label="Launch notes actions"')
    expect(html).toContain("row-menu-button")
  })
})
