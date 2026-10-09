import { describe, expect, it } from "vitest"
import { SAMPLE_DIFF } from "@/features/changes/changes-fixtures"
import { parseDiff } from "@/lib/diff"
import { viewMarkup } from "@/test/view-markup"
import { MobileDiffList, type MobileDiffListProps } from "./diff-list"

const files = parseDiff(SAMPLE_DIFF)

function props(overrides: Partial<MobileDiffListProps> = {}): MobileDiffListProps {
  return {
    files,
    emptyText: "No uncommitted changes.",
    themeType: "dark",
    ...overrides,
  }
}

describe("MobileDiffList", () => {
  it("can show each file with its path and its added and removed counts", () => {
    const markup = viewMarkup(<MobileDiffList {...props()} />)

    expect(markup).toContain("src/app.ts")
    expect(markup).toContain("+1")
    expect(markup).toContain("-1")
  })

  it("can explain an empty diff", () => {
    const markup = viewMarkup(<MobileDiffList {...props({ files: [] })} />)

    expect(markup).toContain("No uncommitted changes.")
  })
})
