import { describe, expect, it } from "vitest"
import { LinkMenu, type LinkMenuProps } from "@/features/link-menu/link-menu"
import { viewMarkup } from "@/test/view-markup"

const noop = () => undefined

function props(overrides: Partial<LinkMenuProps> = {}): LinkMenuProps {
  return {
    url: "https://example.com/docs",
    x: 40,
    y: 60,
    preference: null,
    onOpen: noop,
    onCopy: noop,
    onAlwaysOpen: noop,
    onAlwaysCopy: noop,
    onAskEveryTime: noop,
    ...overrides,
  }
}

describe("LinkMenu", () => {
  it("offers open, copy and both remembered decisions when nothing is remembered", () => {
    const markup = viewMarkup(<LinkMenu {...props()} />)

    expect(markup).toContain("Open in browser")
    expect(markup).toContain("Copy link")
    expect(markup).toContain("Always open in browser")
    expect(markup).toContain("Always copy link")
    expect(markup).not.toContain("Ask every time")
  })

  it("drops the remembered decision's always item and offers asking again", () => {
    const markup = viewMarkup(<LinkMenu {...props({ preference: "browser" })} />)

    expect(markup).not.toContain("Always open in browser")
    expect(markup).toContain("Always copy link")
    expect(markup).toContain("Ask every time")
  })
})