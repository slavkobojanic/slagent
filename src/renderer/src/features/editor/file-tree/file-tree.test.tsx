import { describe, expect, it, vi } from "vitest"
import { FileTree, type FileTreeProps } from "@/features/editor/file-tree/file-tree"
import type { TreeRow } from "@/features/editor/file-tree/file-tree-types"
import { viewMarkup } from "@/test/view-markup"

const row = (overrides: Partial<TreeRow>): TreeRow => ({ path: "a.ts", name: "a.ts", depth: 0, dir: false, expanded: false, loading: false, ...overrides })

const base: FileTreeProps = {
  rows: [row({ path: "src", name: "src", dir: true, expanded: true }), row({ path: "src/index.ts", name: "index.ts", depth: 1 }), row({})],
  activePath: null,
  error: null,
  onToggle: vi.fn(),
  onOpen: vi.fn(),
  onRefresh: vi.fn(),
}

describe("FileTree", () => {
  it("can list each row by name", () => {
    const markup = viewMarkup(<FileTree {...base} />)

    expect(markup).toContain(">src<")
    expect(markup).toContain(">index.ts<")
    expect(markup).toContain(">a.ts<")
  })

  it("can mark an open folder as expanded and a closed one as collapsed", () => {
    const closed = viewMarkup(<FileTree {...base} rows={[row({ path: "src", name: "src", dir: true })]} />)

    expect(viewMarkup(<FileTree {...base} />)).toContain('aria-expanded="true"')
    expect(closed).toContain('aria-expanded="false"')
  })

  it("can leave files without an expanded state", () => {
    expect(viewMarkup(<FileTree {...base} rows={[row({})]} />)).not.toContain("aria-expanded")
  })

  it("can indent a row by its depth", () => {
    const markup = viewMarkup(<FileTree {...base} />)

    expect(markup).toContain("padding-left: 20px")
    expect(markup).toContain('aria-level="2"')
  })

  it("can highlight the file open in the editor", () => {
    const markup = viewMarkup(<FileTree {...base} activePath="src/index.ts" />)

    expect(markup).toMatch(/aria-selected="true"[^>]*title="src\/index.ts"/)
  })

  it("can dim a folder that is still loading", () => {
    expect(viewMarkup(<FileTree {...base} rows={[row({ path: "src", name: "src", dir: true, loading: true })]} />)).toContain("opacity-50")
  })

  it("can offer a refresh", () => {
    expect(viewMarkup(<FileTree {...base} />)).toContain('aria-label="Refresh files"')
  })

  it("can show an error", () => {
    const markup = viewMarkup(<FileTree {...base} error="The project folder could not be read." />)

    expect(markup).toContain("The project folder could not be read.")
    expect(markup).toContain('role="alert"')
  })

  it("can show an empty tree", () => {
    expect(viewMarkup(<FileTree {...base} rows={[]} />)).toContain('role="tree"')
  })
})
