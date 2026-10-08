import type { ITheme } from "@xterm/xterm"

// xterm paints through a canvas, which resolves neither var() nor color-mix(),
// so every colour comes from a theme token read as the browser computed it.
export function terminalTheme(read: (token: string) => string): ITheme {
  return {
    background: read("--background"),
    foreground: read("--foreground"),
    cursor: read("--foreground"),
    cursorAccent: read("--background"),
    selectionBackground: read("--terminal-selection"),
    black: read("--terminal-black"),
    red: read("--terminal-red"),
    green: read("--terminal-green"),
    yellow: read("--terminal-yellow"),
    blue: read("--terminal-blue"),
    magenta: read("--terminal-magenta"),
    cyan: read("--terminal-cyan"),
    white: read("--terminal-white"),
    brightBlack: read("--terminal-bright-black"),
    brightRed: read("--terminal-bright-red"),
    brightGreen: read("--terminal-bright-green"),
    brightYellow: read("--terminal-bright-yellow"),
    brightBlue: read("--terminal-bright-blue"),
    brightMagenta: read("--terminal-bright-magenta"),
    brightCyan: read("--terminal-bright-cyan"),
    brightWhite: read("--terminal-bright-white"),
  }
}
