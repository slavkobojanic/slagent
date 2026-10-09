import { describe, expect, it, vi } from "vitest"
import { viewMarkup } from "@/test/view-markup"
import { MobileChangesScreen, type MobileChangesScreenProps } from "./changes-screen"

function named(label: string) {
  return function Named() {
    return <p>{label}</p>
  }
}

function props(overrides: Partial<MobileChangesScreenProps> = {}): MobileChangesScreenProps {
  return {
    projectName: "slagent",
    branch: "main",
    count: 2,
    loading: false,
    DiffList: named("DiffList"),
    onBack: vi.fn(),
    onRefresh: vi.fn(),
    ...overrides,
  }
}

describe("MobileChangesScreen", () => {
  it("can show the count, the project and the diff", () => {
    const markup = viewMarkup(<MobileChangesScreen {...props()} />)

    expect(markup).toContain("Changes (2)")
    expect(markup).toContain("slagent")
    expect(markup).toContain("DiffList")
    expect(markup).toContain('aria-label="Back to chat"')
    expect(markup).toContain('aria-label="Refresh"')
  })

  it("can leave the count out when nothing is changed", () => {
    const markup = viewMarkup(<MobileChangesScreen {...props({ count: 0 })} />)

    expect(markup).not.toContain("Changes (")
    expect(markup).toContain("Changes")
  })

  it("can show the branch when the chat has no folder", () => {
    const markup = viewMarkup(<MobileChangesScreen {...props({ projectName: null })} />)

    expect(markup).toContain("main")
  })

  it("can spin the refresh while the diff loads", () => {
    const markup = viewMarkup(<MobileChangesScreen {...props({ loading: true })} />)

    expect(markup).toContain("animate-spin")
  })
})
