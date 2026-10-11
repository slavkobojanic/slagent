import { describe, expect, it } from "vitest"
import { EDITOR_PACKS } from "@shared/editor"
import { packRows } from "@/lib/editor-packs"

describe("packRows", () => {
  it("can list every known pack in registry order", () => {
    expect(packRows([]).map((row) => row.id)).toEqual(EDITOR_PACKS.map((pack) => pack.id))
  })

  it("can mark the enabled packs", () => {
    const rows = packRows(["java", "python"])

    expect(rows.filter((row) => row.enabled).map((row) => row.id)).toEqual(["python", "java"])
  })

  it("can ignore an enabled id that is not a known pack", () => {
    expect(packRows(["cobol"]).every((row) => !row.enabled)).toBe(true)
  })

  it("can carry the label and languages for display", () => {
    expect(packRows([]).find((row) => row.id === "java")).toMatchObject({ label: "Java", languages: "Java" })
  })
})
