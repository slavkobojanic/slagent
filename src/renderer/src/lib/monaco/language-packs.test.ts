import { describe, expect, it } from "vitest"
import { EDITOR_PACKS } from "@shared/editor"
import { PACK_LOADERS } from "@/lib/monaco/language-packs"

describe("PACK_LOADERS", () => {
  it("can load every pack the settings list", () => {
    for (const pack of EDITOR_PACKS) {
      expect(PACK_LOADERS[pack.id], pack.id).toBeTypeOf("function")
    }
  })

  it("can avoid loaders for packs the settings do not list", () => {
    const listed = new Set(EDITOR_PACKS.map((pack) => pack.id))

    expect(Object.keys(PACK_LOADERS).filter((id) => !listed.has(id))).toEqual([])
  })
})
