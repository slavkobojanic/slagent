import { describe, expect, it } from "vitest"
import { SAMPLE_DIFF } from "@/features/changes/changes-fixtures"
import { parseDiff } from "@/lib/diff"
import { viewMarkup } from "@/test/view-markup"
import { DiffFiles } from "./diff-files"

function StubFile({ file }: { file: { path: string } }) {
  return <section>{file.path}</section>
}

describe("DiffFiles", () => {
  it("can show the empty message when the diff has no files", () => {
    const markup = viewMarkup(<DiffFiles files={[]} emptyText="This folder is not a git repository." DiffFile={StubFile} />)

    expect(markup).toContain("This folder is not a git repository.")
  })

  it("can show each changed file when the diff has changes", () => {
    const markup = viewMarkup(<DiffFiles files={parseDiff(SAMPLE_DIFF)} emptyText="No uncommitted changes." DiffFile={StubFile} />)

    expect(markup).toContain("src/app.ts")
    expect(markup).not.toContain("No uncommitted changes.")
  })
})
