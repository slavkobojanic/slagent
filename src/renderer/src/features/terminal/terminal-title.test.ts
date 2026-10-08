import { describe, expect, it } from "vitest"
import { terminalTitle } from "@/features/terminal/terminal-title"

describe("terminalTitle", () => {
  it("can keep the path of the default zsh user@host title", () => {
    expect(terminalTitle("slavko@Slavkos-MacBook-Pro: ~/code/slagent")).toBe("~/code/slagent")
  })

  it("can leave a title that names no host alone", () => {
    expect(terminalTitle("slagent")).toBe("slagent")
  })

  it("can keep the whole title when the host is all there is", () => {
    expect(terminalTitle("slavko@Slavkos-MacBook-Pro: ")).toBe("slavko@Slavkos-MacBook-Pro:")
  })
})
