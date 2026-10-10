import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { ChainOfThought, ChainOfThoughtContent, ChainOfThoughtHeader, ChainOfThoughtStep } from "@/components/ai-elements/chain-of-thought"
import { cn } from "@/lib/utils"

export type ToolStepProps = {
  id: string
  icon: LucideIcon
  label: ReactNode
  active: boolean
  error: boolean
  output: ReactNode
}

export type ToolChainProps = {
  steps: ToolStepProps[]
  // Replaces the "Tools" header once the small model has described the steps:
  // what the collapsed chain reads instead of a bare noun.
  summary?: string
  // Only read on mount: a turn that is still running opens so its progress shows, and a
  // finished turn starts collapsed.
  defaultOpen: boolean
}

export function ToolChain({ steps, summary, defaultOpen }: ToolChainProps) {
  // A chain that mounted while a step ran stays open so the progress shows, and
  // settles closed once the steps have been quiet for a moment, leaving the
  // header summary to carry what the turn did. A manual toggle wins.
  const [userOpen, setUserOpen] = useState<boolean | null>(null)
  const [autoOpen, setAutoOpen] = useState(defaultOpen)
  const mountedWhileRunning = useRef(defaultOpen)
  const anyActive = steps.some((step) => step.active)

  useEffect(() => {
    if (!mountedWhileRunning.current) return
    if (anyActive) {
      setAutoOpen(true)
      return
    }
    const timer = setTimeout(() => setAutoOpen(false), 1000)
    return () => clearTimeout(timer)
  }, [anyActive])

  return (
    <ChainOfThought open={userOpen ?? autoOpen} onOpenChange={setUserOpen}>
      <ChainOfThoughtHeader>{summary ? <span className="animate-in fade-in-0 duration-500">{summary}</span> : "Tools"}</ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        {steps.map((step) => (
          <ToolStep key={step.id} step={step} />
        ))}
      </ChainOfThoughtContent>
    </ChainOfThought>
  )
}

// A step's output streams while it runs and collapses the moment it hands over, either to the
// next step or to the end of the turn. Failed steps stay open, and clicking a collapsed step
// re-opens it.
function ToolStep({ step }: { step: ToolStepProps }) {
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (step.active) {
      setExpanded(false)
    }
  }, [step.active])

  const showOutput = step.active || step.error || expanded

  return (
    <ChainOfThoughtStep
      icon={step.icon}
      label={step.label}
      status={step.active ? "active" : "complete"}
      className={cn(step.error && "text-destructive", step.output && !step.active && !step.error && "cursor-pointer")}
      onClick={() => {
        if (step.output && !step.active && !step.error) {
          setExpanded((value) => !value)
        }
      }}
    >
      {showOutput ? step.output : null}
    </ChainOfThoughtStep>
  )
}