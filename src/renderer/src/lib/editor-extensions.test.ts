import { describe, expect, it } from "vitest"
import type { EditorExtensionPref, EditorExtensionResult } from "@shared/editor"
import { installedRows, isVimEnabled, isVimInstalled, resultRows } from "@/lib/editor-extensions"

const vim: EditorExtensionPref = { id: "vscodevim.vim", version: "1.32.4", enabled: true }
const other: EditorExtensionPref = { id: "redhat.java", version: "1.0.0", enabled: false }
const hit = (id: string): EditorExtensionResult => ({ id, version: "1.0.0", name: id, description: "d", downloads: 3, verified: true, iconUrl: null })

describe("isVimInstalled and isVimEnabled", () => {
  it("can tell when vim is not installed", () => {
    expect(isVimInstalled([other])).toBe(false)
    expect(isVimEnabled([other])).toBe(false)
  })

  it("can tell an installed but disabled vim", () => {
    expect(isVimInstalled([{ ...vim, enabled: false }])).toBe(true)
    expect(isVimEnabled([{ ...vim, enabled: false }])).toBe(false)
  })

  it("can tell an enabled vim regardless of case", () => {
    expect(isVimEnabled([{ ...vim, id: "VSCodeVim.Vim" }])).toBe(true)
  })
})

describe("installedRows", () => {
  it("can leave vim out because it has its own switch", () => {
    expect(installedRows([vim, other], []).map((row) => row.id)).toEqual(["redhat.java"])
  })

  it("can mark an extension that is being installed or removed", () => {
    expect(installedRows([other], ["redhat.java"])[0]?.busy).toBe(true)
  })

  it("can carry the version and enabled flag", () => {
    expect(installedRows([other], [])[0]).toEqual({ id: "redhat.java", version: "1.0.0", enabled: false, busy: false })
  })
})

describe("resultRows", () => {
  it("can mark a result that is already installed", () => {
    const rows = resultRows([hit("redhat.java"), hit("a.b")], [other], [])

    expect(rows.map((row) => row.installed)).toEqual([true, false])
  })

  it("can mark a result that is installing", () => {
    expect(resultRows([hit("a.b")], [], ["a.b"])[0]?.busy).toBe(true)
  })
})
