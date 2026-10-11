import { describe, expect, it } from "vitest"
import { DEFAULT_EDITOR_PREFS } from "../shared/editor"
import { parseEditorPrefs } from "./prefs"

describe("parseEditorPrefs", () => {
  it("can fall back to the defaults when nothing is stored", () => {
    expect(parseEditorPrefs(null)).toEqual(DEFAULT_EDITOR_PREFS)
    expect(parseEditorPrefs("nope")).toEqual(DEFAULT_EDITOR_PREFS)
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
})
