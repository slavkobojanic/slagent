import { beforeEach, describe, expect, it, vi } from "vitest"

const { getSharedHighlighter } = vi.hoisted(() => ({ getSharedHighlighter: vi.fn() }))

vi.mock("@pierre/diffs", () => ({ getSharedHighlighter }))

import { PIERRE_THEME, preloadPierreHighlighter } from "@/lib/pierre"

describe("preloadPierreHighlighter", () => {
  beforeEach(() => {
    getSharedHighlighter.mockReset()
  })

  it("can load the highlighter with both app themes and resolve true", async () => {
    getSharedHighlighter.mockResolvedValue({})

    await expect(preloadPierreHighlighter()).resolves.toBe(true)
    expect(getSharedHighlighter).toHaveBeenCalledWith({ themes: [PIERRE_THEME.dark, PIERRE_THEME.light], langs: [] })
  })

  it("can resolve false when the highlighter fails to load", async () => {
    getSharedHighlighter.mockRejectedValue(new Error("no engine"))

    await expect(preloadPierreHighlighter()).resolves.toBe(false)
  })
})
