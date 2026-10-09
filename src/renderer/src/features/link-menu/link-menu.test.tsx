import { describe, expect, it, vi } from "vitest"
import { LinkMenu, type LinkMenuProps } from "@/features/link-menu/link-menu"
import { fireEvent, render, screen } from "@testing-library/react"

const noop = () => undefined

function props(overrides: Partial<LinkMenuProps> = {}): LinkMenuProps {
  return {
    url: "https://example.com/docs",
    x: 40,
    y: 60,
    preference: null,
    onOpen: noop,
    onCopy: noop,
    onAskEveryTime: noop,
    ...overrides,
  }
}

describe("LinkMenu", () => {
  it("offers open and copy with an unchecked remember box when nothing is remembered", () => {
    render(<LinkMenu {...props()} />)

    expect(screen.queryByRole("button", { name: "Open in browser" })).not.toBeNull()
    expect(screen.queryByRole("button", { name: "Copy link" })).not.toBeNull()
    expect(screen.getByRole("checkbox", { name: "Remember this choice" }).getAttribute("aria-checked")).toBe("false")
    expect(screen.queryByRole("button", { name: "Ask every time" })).toBeNull()
  })

  it("offers going back to asking when a decision is remembered", () => {
    render(<LinkMenu {...props({ preference: "browser" })} />)

    expect(screen.queryByRole("button", { name: "Ask every time" })).not.toBeNull()
  })

  it("passes an unchecked box with the picked choice", () => {
    const onCopy = vi.fn()
    render(<LinkMenu {...props({ onCopy })} />)

    fireEvent.click(screen.getByRole("button", { name: "Copy link" }))

    expect(onCopy).toHaveBeenCalledWith("https://example.com/docs", false)
  })

  it("reports a remembered copy when the box is checked first", () => {
    const onCopy = vi.fn()
    render(<LinkMenu {...props({ onCopy })} />)

    fireEvent.click(screen.getByRole("checkbox", { name: "Remember this choice" }))
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }))

    expect(onCopy).toHaveBeenCalledWith("https://example.com/docs", true)
  })

  it("keeps the checkbox state while the menu stays open", () => {
    const onOpen = vi.fn()
    render(<LinkMenu {...props({ onOpen })} />)

    fireEvent.click(screen.getByRole("checkbox", { name: "Remember this choice" }))
    expect(screen.getByRole("checkbox", { name: "Remember this choice" }).getAttribute("aria-checked")).toBe("true")

    fireEvent.click(screen.getByRole("button", { name: "Open in browser" }))

    expect(onOpen).toHaveBeenCalledWith("https://example.com/docs", true)
  })
})
