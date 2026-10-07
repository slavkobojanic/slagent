import Ansi from "ansi-to-react"
import { ChevronDownIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { PinnedScroller } from "@/components/ai-elements/conversation"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

export type BashOutputProps = {
  command: string
  output: string
  running: boolean
  isError: boolean
}

// The terminal output streams while the command runs and collapses the moment it succeeds, so
// the transcript stays tidy. Failed runs stay open, and the command line toggles it either way.
export function BashOutput({ command, output, running, isError }: BashOutputProps) {
  const wasRunning = useRef(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (running) {
      wasRunning.current = true
      setCollapsed(false)
    } else if (wasRunning.current) {
      wasRunning.current = false
      if (!isError) {
        setCollapsed(true)
      }
    }
  }, [running, isError])

  return (
    <Collapsible open={!collapsed} onOpenChange={(open) => setCollapsed(!open)}>
      <div className="mt-1 overflow-hidden rounded-md bg-white/5 font-mono text-xs">
        <CollapsibleTrigger asChild>
          <button type="button" className="flex w-full cursor-pointer items-start gap-1.5 px-3 py-2 text-left">
            <ChevronDownIcon
              className={cn("mt-0.5 size-3 shrink-0 text-white/40 transition-transform", !collapsed && "rotate-180")}
            />
            <div className="break-all whitespace-pre-wrap text-white/90">
              <span className="select-none text-white/40">$ </span>
              {command}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <PinnedScroller watch={output} className="max-h-72 overflow-auto px-3 pb-2">
            {output ? (
              <div className={cn("break-words whitespace-pre-wrap text-white/60", isError && "text-destructive")}>
                <Ansi>{output}</Ansi>
              </div>
            ) : running ? (
              <div className="text-white/30">Running…</div>
            ) : null}
          </PinnedScroller>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}