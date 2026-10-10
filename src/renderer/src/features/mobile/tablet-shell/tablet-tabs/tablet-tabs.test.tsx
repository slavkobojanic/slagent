import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { TabletTabs } from "@/features/mobile/tablet-shell/tablet-tabs/tablet-tabs"
import { PORTRAIT_TABS } from "@/features/mobile/tablet-shell/tablet-tab"

describe("TabletTabs", () => {
  it("can select a tab", () => {
    const onSelect = vi.fn()
    render(<TabletTabs tabs={PORTRAIT_TABS} active="chat" badges={{}} safeTop onSelect={onSelect} />)
    fireEvent.click(screen.getByRole("tab", { name: "Plan" }))
    expect(onSelect).toHaveBeenCalledWith("plan")
  })

  it("can mark the active tab", () => {
    render(<TabletTabs tabs={PORTRAIT_TABS} active="file" badges={{}} safeTop onSelect={() => undefined} />)
    expect(screen.getByRole("tab", { name: "Source" }).getAttribute("aria-selected")).toBe("true")
    expect(screen.getByRole("tab", { name: "Chat" }).getAttribute("aria-selected")).toBe("false")
  })

  it("can badge the diff with its changed files", () => {
    render(<TabletTabs tabs={PORTRAIT_TABS} active="chat" badges={{ changes: "3" }} safeTop onSelect={() => undefined} />)
    expect(screen.getByRole("tab", { name: /^Diff/ }).textContent).toBe("Diff3")
  })
})
