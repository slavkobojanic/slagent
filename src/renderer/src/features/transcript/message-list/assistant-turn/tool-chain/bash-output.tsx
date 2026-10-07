import Ansi from "ansi-to-react"
import { PinnedScroller } from "@/components/ai-elements/conversation"
import { cn } from "@/lib/utils"

export type BashOutputProps = {
  command: string
  output: string
  running: boolean
  isError: boolean
}

export function BashOutput({ command, output, running, isError }: BashOutputProps) {
  return (
    <div className="mt-1 overflow-hidden rounded-md border border-white/10 bg-white/5 font-mono text-xs">
      <PinnedScroller watch={output} className="max-h-72 overflow-auto px-3 py-2">
        <div className="break-all whitespace-pre-wrap text-white/90">
          <span className="text-white/40 select-none">$ </span>
          {command}
        </div>
        {output ? (
          <div className={cn("mt-1 break-words whitespace-pre-wrap text-white/60", isError && "text-destructive")}>
            <Ansi>{output}</Ansi>
          </div>
        ) : running ? (
          <div className="mt-1 text-white/30">Running…</div>
        ) : null}
      </PinnedScroller>
    </div>
  )
}
