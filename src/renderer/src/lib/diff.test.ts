import { describe, expect, it } from "vitest"
import { lineText, parseDiff } from "@/lib/diff"

const ONE_FILE = [
  "diff --git a/src/app.ts b/src/app.ts",
  "index 1111111..2222222 100644",
  "--- a/src/app.ts",
  "+++ b/src/app.ts",
  "@@ -1,3 +1,3 @@",
  " const a = 1",
  "-const b = 2",
  "+const b = 3",
  " export {}",
  "",
].join("\n")

const TWO_FILES = [
  "diff --git a/one.ts b/one.ts",
  "--- a/one.ts",
  "+++ b/one.ts",
  "@@ -1 +1,2 @@",
  "-old",
  "+new",
  "+extra",
  "diff --git a/two.ts b/two.ts",
  "new file mode 100644",
  "--- /dev/null",
  "+++ b/two.ts",
  "@@ -0,0 +1 @@",
  "+created",
  "",
].join("\n")

describe("parseDiff", () => {
  it("can return no files for an empty diff", () => {
    expect(parseDiff("")).toEqual([])
  })

  it("can split a diff into one entry per file, named by its new path", () => {
    const files = parseDiff(TWO_FILES)

    expect(files.map((file) => file.path)).toEqual(["one.ts", "two.ts"])
  })

  it("can count the added and removed lines of each file", () => {
    const [one, two] = parseDiff(TWO_FILES)

    expect([one.added, one.removed]).toEqual([2, 1])
    expect([two.added, two.removed]).toEqual([1, 0])
  })

  it("can number each line on the side it belongs to", () => {
    const [file] = parseDiff(ONE_FILE)

    expect(file.lines).toEqual([
      { kind: "hunk", text: "@@ -1,3 +1,3 @@", oldLine: null, newLine: null },
      { kind: "context", text: " const a = 1", oldLine: 1, newLine: 1 },
      { kind: "del", text: "-const b = 2", oldLine: 2, newLine: null },
      { kind: "add", text: "+const b = 3", oldLine: null, newLine: 2 },
      { kind: "context", text: " export {}", oldLine: 3, newLine: 3 },
    ])
  })

  it("can keep each file's own patch, header included, for Pierre to render", () => {
    const [one, two] = parseDiff(TWO_FILES)

    expect(one.patch.startsWith("diff --git a/one.ts b/one.ts\n")).toBe(true)
    expect(one.patch).not.toContain("created")
    expect(two.patch).toContain("+created")
  })
})

describe("lineText", () => {
  it("can quote the old line on the old side", () => {
    const [file] = parseDiff(ONE_FILE)

    expect(lineText(file, "old", 2)).toBe("const b = 2")
  })

  it("can quote the new line on the new side", () => {
    const [file] = parseDiff(ONE_FILE)

    expect(lineText(file, "new", 2)).toBe("const b = 3")
  })

  it("can quote a context line from either side", () => {
    const [file] = parseDiff(ONE_FILE)

    expect(lineText(file, "old", 1)).toBe("const a = 1")
    expect(lineText(file, "new", 3)).toBe("export {}")
  })

  it("can return an empty string when the line is not in the diff", () => {
    const [file] = parseDiff(ONE_FILE)

    expect(lineText(file, "new", 99)).toBe("")
  })
})
