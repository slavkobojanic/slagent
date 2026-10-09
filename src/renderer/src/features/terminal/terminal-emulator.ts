import { FitAddon } from "@xterm/addon-fit"
import { WebLinksAddon } from "@xterm/addon-web-links"
import { Terminal, type ITheme } from "@xterm/xterm"

export type TerminalEmulatorOptions = {
  theme: ITheme
  onData: (data: string) => void
  onResize: (cols: number, rows: number) => void
  onTitle: (title: string) => void
  onLink: (url: string) => void
}

export type TerminalEmulator = {
  attach: (element: HTMLElement) => void
  write: (data: string) => void
  focus: () => void
  fit: () => void
  setTheme: (theme: ITheme) => void
  dispose: () => void
}

export type TerminalEmulatorFactory = (options: TerminalEmulatorOptions) => TerminalEmulator

// xterm owns the text grid, the cursor and the scrollback; the renderer only
// forwards keystrokes out and shell output in.
export function createTerminalEmulator({ theme, onData, onResize, onTitle, onLink }: TerminalEmulatorOptions): TerminalEmulator {
  const terminal = new Terminal({
    theme,
    fontFamily: '"Monaspace Neon Var", ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 12,
    lineHeight: 1.3,
    cursorBlink: true,
    cursorStyle: "bar",
    scrollback: 10_000,
  })
  const fit = new FitAddon()
  terminal.loadAddon(fit)
  terminal.loadAddon(new WebLinksAddon((_event, url) => onLink(url)))
  terminal.onData(onData)
  terminal.onTitleChange(onTitle)
  terminal.onResize(({ cols, rows }) => onResize(cols, rows))

  return {
    attach: (element) => terminal.open(element),
    write: (data) => terminal.write(data),
    focus: () => terminal.focus(),
    fit: () => {
      const element = terminal.element
      // A collapsed drawer has no size to measure, and fit() would ask for zero rows.
      if (!element || element.clientWidth === 0 || element.clientHeight === 0) return
      fit.fit()
    },
    setTheme: (next) => {
      terminal.options.theme = next
    },
    dispose: () => terminal.dispose(),
  }
}
