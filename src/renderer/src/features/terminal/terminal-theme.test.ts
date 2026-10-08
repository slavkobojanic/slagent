import { describe, expect, it } from "vitest"
import { terminalTheme } from "@/features/terminal/terminal-theme"

function tokenReader(token: string): string {
  return `value:${token}`
}

describe("terminalTheme", () => {
  it("can take the surface and the cursor from the theme tokens", () => {
    const theme = terminalTheme(tokenReader)

    expect(theme.background).toBe("value:--background")
    expect(theme.foreground).toBe("value:--foreground")
    expect(theme.cursor).toBe("value:--foreground")
    expect(theme.cursorAccent).toBe("value:--background")
    expect(theme.selectionBackground).toBe("value:--terminal-selection")
  })

  it("can fill all sixteen ANSI colours from their own tokens", () => {
    const theme = terminalTheme(tokenReader)

    expect(theme.black).toBe("value:--terminal-black")
    expect(theme.red).toBe("value:--terminal-red")
    expect(theme.green).toBe("value:--terminal-green")
    expect(theme.yellow).toBe("value:--terminal-yellow")
    expect(theme.blue).toBe("value:--terminal-blue")
    expect(theme.magenta).toBe("value:--terminal-magenta")
    expect(theme.cyan).toBe("value:--terminal-cyan")
    expect(theme.white).toBe("value:--terminal-white")
    expect(theme.brightBlack).toBe("value:--terminal-bright-black")
    expect(theme.brightRed).toBe("value:--terminal-bright-red")
    expect(theme.brightGreen).toBe("value:--terminal-bright-green")
    expect(theme.brightYellow).toBe("value:--terminal-bright-yellow")
    expect(theme.brightBlue).toBe("value:--terminal-bright-blue")
    expect(theme.brightMagenta).toBe("value:--terminal-bright-magenta")
    expect(theme.brightCyan).toBe("value:--terminal-bright-cyan")
    expect(theme.brightWhite).toBe("value:--terminal-bright-white")
  })
})
