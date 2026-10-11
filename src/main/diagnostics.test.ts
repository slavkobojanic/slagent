import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { DiagnosticsService, formatDiagnostics } from "./diagnostics"

// The repo root has node_modules/typescript, so it doubles as the project the
// service finds tsserver in. Each test gets its own scratch dir inside it.
const repoCwd = process.cwd()

const service = new DiagnosticsService()

let scratch: string | null = null

function scratchDir(): string {
  scratch = mkdtempSync(join(repoCwd, ".diagnostics-test-"))
  return scratch
}

afterEach(() => {
  service.stopAll()
  if (scratch) {
    rmSync(scratch, { recursive: true, force: true })
    scratch = null
  }
})

describe("DiagnosticsService", () => {
  it("reports the type error of a bad assignment", { timeout: 30_000 }, async () => {
    const dir = scratchDir()
    const file = join(dir, "bad.ts")
    writeFileSync(file, "const count: number = \"nope\"\n")
    const found = await service.diagnose(repoCwd, file)
    expect(found.some((d) => d.severity === "error" && d.code === 2322)).toBe(true)
  })

  it("sees the file as it is on disk after a rewrite", { timeout: 30_000 }, async () => {
    const dir = scratchDir()
    const file = join(dir, "changed.ts")
    writeFileSync(file, "export const ok: number = 1\n")
    await service.diagnose(repoCwd, file)
    writeFileSync(file, "export const broken: number = \"nope\"\n")
    const found = await service.diagnose(repoCwd, file)
    expect(found.some((d) => d.severity === "error" && d.code === 2322)).toBe(true)
  })

  it("skips files that are not code", async () => {
    const dir = scratchDir()
    const file = join(dir, "notes.md")
    writeFileSync(file, "const count: number = \"nope\"\n")
    expect(await service.diagnose(repoCwd, file)).toEqual([])
  })

  it("returns nothing when the project has no typescript", async () => {
    const outside = mkdtempSync(join(tmpdir(), "diagnostics-no-ts-"))
    try {
      const file = join(outside, "bad.ts")
      writeFileSync(file, "const count: number = \"nope\"\n")
      expect(await service.diagnose(outside, file)).toEqual([])
    } finally {
      rmSync(outside, { recursive: true, force: true })
    }
  })
})

describe("formatDiagnostics", () => {
  it("renders one line per diagnostic with position and code", () => {
    const text = formatDiagnostics(repoCwd, join(repoCwd, "src", "bad.ts"), [
      { severity: "error", line: 12, column: 3, code: 2339, text: "Property 'x' does not exist." },
      { severity: "warning", line: 20, column: 1, code: 6133, text: "'y' is declared but never used." },
    ])
    expect(text).toContain("2 problems")
    expect(text).toContain("12:3 error TS2339: Property 'x' does not exist.")
    expect(text).toContain("20:1 warning TS6133")
    expect(text).toContain("src/bad.ts")
  })

  it("caps the list and says how many were left out", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ severity: "error" as const, line: i + 1, column: 1, code: 2322, text: "nope" }))
    const text = formatDiagnostics(repoCwd, join(repoCwd, "bad.ts"), many)
    expect(text).toContain("30 problems")
    expect(text.match(/TS2322/g)?.length).toBe(20)
    expect(text).toContain("and 10 more")
  })
})
