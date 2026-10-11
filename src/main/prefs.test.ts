import { describe, expect, it } from "vitest"
import { DEFAULT_EDITOR_PREFS } from "../shared/editor"
import { parseEditorPrefs } from "./prefs"

describe("parseEditorPrefs", () => {
  it("can fall back to the defaults when nothing is stored", () => {
    expect(parseEditorPrefs(null)).toEqual(DEFAULT_EDITOR_PREFS)
    expect(parseEditorPrefs("nope")).toEqual(DEFAULT_EDITOR_PREFS)
  })

  it("can return a fresh copy of the default packs each time", () => {
    const first = parseEditorPrefs(null)
    first.packs.push("java")

    expect(parseEditorPrefs(null).packs).not.toContain("java")
  })

  it("can clamp the font and tab sizes to their range", () => {
    expect(parseEditorPrefs({ fontSize: 400, tabSize: 0 })).toMatchObject({ fontSize: 32, tabSize: 1 })
    expect(parseEditorPrefs({ fontSize: 2, tabSize: 99 })).toMatchObject({ fontSize: 8, tabSize: 8 })
  })

  it("can round a fractional size and ignore a non-number", () => {
    expect(parseEditorPrefs({ fontSize: 13.6 }).fontSize).toBe(14)
    expect(parseEditorPrefs({ fontSize: "big" }).fontSize).toBe(DEFAULT_EDITOR_PREFS.fontSize)
  })

  it("can read the wrap and minimap flags", () => {
    expect(parseEditorPrefs({ wordWrap: true, minimap: true })).toMatchObject({ wordWrap: true, minimap: true })
    expect(parseEditorPrefs({ wordWrap: "yes" }).wordWrap).toBe(false)
  })

  it("can drop unknown and duplicate packs", () => {
    expect(parseEditorPrefs({ packs: ["java", "java", "cobol", 7] }).packs).toEqual(["java"])
  })

  it("can keep an empty pack list the user chose", () => {
    expect(parseEditorPrefs({ packs: [] }).packs).toEqual([])
  })

  it("can keep a well formed extension and default it to enabled", () => {
    const { extensions } = parseEditorPrefs({ extensions: [{ id: "vscodevim.vim", version: "1.32.4" }] })

    expect(extensions).toEqual([{ id: "vscodevim.vim", version: "1.32.4", enabled: true }])
  })

  it("can keep an extension the user disabled", () => {
    const { extensions } = parseEditorPrefs({ extensions: [{ id: "vscodevim.vim", version: "1.32.4", enabled: false }] })

    expect(extensions[0]?.enabled).toBe(false)
  })

  it("can drop an extension id that could escape its folder", () => {
    const { extensions } = parseEditorPrefs({
      extensions: [
        { id: "../evil.ext", version: "1.0.0" },
        { id: "a/b.c", version: "1.0.0" },
        { id: "noperiod", version: "1.0.0" },
      ],
    })

    expect(extensions).toEqual([])
  })

  it("can drop an extension version that could escape its folder", () => {
    const { extensions } = parseEditorPrefs({ extensions: [{ id: "a.b", version: "../1" }] })

    expect(extensions).toEqual([])
  })

  it("can keep one entry per extension id", () => {
    const { extensions } = parseEditorPrefs({
      extensions: [
        { id: "a.b", version: "1.0.0" },
        { id: "a.b", version: "2.0.0" },
      ],
    })

    expect(extensions).toHaveLength(1)
  })
})
