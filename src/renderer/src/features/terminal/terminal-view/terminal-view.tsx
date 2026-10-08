import { cn } from "@/lib/utils"

export type TerminalViewProps = {
  active: boolean
  // The presenter attaches the xterm instance to this element.
  onAttach: (element: HTMLDivElement | null) => void
}

export function TerminalView({ active, onAttach }: TerminalViewProps) {
  return (
    <div
      ref={onAttach}
      data-active={active || undefined}
      // Hidden, not unmounted: a background tab keeps its scrollback and its size.
      className={cn("terminal-surface absolute inset-0", active ? "visible" : "invisible")}
    />
  )
}
