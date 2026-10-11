import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { rendererFile } from "./renderer-file"

const root = join("/app", "renderer")

describe("rendererFile", () => {
  it("can map the root to index.html", () => {
    expect(rendererFile(root, "/")).toBe(join(root, "index.html"))
  })

  it("can map an asset path under the renderer folder", () => {
    expect(rendererFile(root, "/assets/index-abc.js")).toBe(join(root, "assets", "index-abc.js"))
  })

  it("can decode an escaped path", () => {
    expect(rendererFile(root, "/assets/a%20b.js")).toBe(join(root, "assets", "a b.js"))
  })

  it("can refuse a path that climbs out of the renderer folder", () => {
    expect(rendererFile(root, "/../secret.txt")).toBeNull()
    expect(rendererFile(root, "/%2e%2e/secret.txt")).toBeNull()
  })

  it("can refuse a sibling folder that shares the prefix", () => {
    expect(rendererFile(root, "/../renderer-other/a.js")).toBeNull()
  })

  it("can refuse a malformed escape", () => {
    expect(rendererFile(root, "/%E0%A4%A")).toBeNull()
  })
})
