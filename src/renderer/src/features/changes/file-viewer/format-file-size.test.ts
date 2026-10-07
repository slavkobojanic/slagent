import { describe, expect, it } from "vitest"
import { formatFileSize } from "./format-file-size"

describe("formatFileSize", () => {
  it("can show a size under one kilobyte in bytes", () => {
    expect(formatFileSize(512)).toBe("512 B")
  })

  it("can show a size under one megabyte in whole kilobytes", () => {
    expect(formatFileSize(2048)).toBe("2 KB")
    expect(formatFileSize(1536)).toBe("2 KB")
  })

  it("can show a size of a megabyte or more to one decimal place", () => {
    expect(formatFileSize(1024 * 1024 * 1.5)).toBe("1.5 MB")
  })
})
