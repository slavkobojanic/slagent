import {
  Terminal,
  TerminalActions,
  TerminalClearButton,
  TerminalContent,
  TerminalHeader,
  TerminalStatus,
  TerminalTitle,
} from "@/components/ai-elements/terminal"

function BashTerminal({
  output,
  streaming,
  onClear,
}: {
  output: string
  streaming: boolean
  onClear: () => void
}) {
  let shown = output
  if (!shown) shown = "Bash output will show up here."

  return (
    <Terminal
      output={shown}
      isStreaming={streaming}
      onClear={onClear}
      className="shrink-0 rounded-none border-x-0 border-b-0 bg-black"
    >
      <TerminalHeader className="border-white/10 py-1.5">
        <TerminalTitle>Terminal</TerminalTitle>
        <TerminalActions>
          <TerminalStatus />
          <TerminalClearButton />
        </TerminalActions>
      </TerminalHeader>
      <TerminalContent className="max-h-36 min-h-24 py-3" />
    </Terminal>
  )
}

export { BashTerminal }
