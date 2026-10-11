import { describe, expect, it, vi } from "vitest"
import { makeFile } from "@/features/changes/changes-fixtures"
import { FileViewer, type FileViewerProps } from "./file-viewer"
import { viewMarkup } from "@/test/view-markup"

function viewer(overrides: Partial<FileViewerProps> = {}): FileViewerProps {
  return {
    file: makeFile({ line: 12 }),
    sizeLabel: "9 B",
    ready: true,
    themeType: "dark",
    scrollRef: vi.fn(),
    onOpenInEditor: vi.fn(),
    ...overrides,
  }
}

describe("FileViewer", () => {
  it("can show the path with its line, the size, and an open-in-editor action", () => {
    const markup = viewMarkup(<FileViewer {...viewer()} />)

    expect(markup).toContain("src/app.ts")
    expect(markup).toContain(":12")
    expect(markup).toContain("9 B")
    expect(markup).toContain("Open in editor")
  })

  it("can say a binary file has no preview", () => {
    const markup = viewMarkup(<FileViewer {...viewer({ file: makeFile({ binary: true }) })} />)

    expect(markup).toContain("This is a binary file.")
    expect(markup).not.toContain("diffs-container")
  })

  it("can note that a large file is shown only in part", () => {
    const markup = viewMarkup(<FileViewer {...viewer({ file: makeFile({ truncated: true }) })} />)

    expect(markup).toContain("Showing the first 2 MB.")
  })

  it("can hold the file back until the highlighter has loaded", () => {
    const markup = viewMarkup(<FileViewer {...viewer({ ready: false })} />)

    expect(markup).toContain("src/app.ts")
    expect(markup).not.toContain("diffs-container")
  })

  it("can render the file once the highlighter has loaded", () => {
    const markup = viewMarkup(<FileViewer {...viewer({ ready: true })} />)

    expect(markup).toContain("diffs-container")
  })
})
