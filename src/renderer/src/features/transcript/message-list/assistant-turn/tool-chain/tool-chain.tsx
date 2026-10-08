import { useEffect, useState } from "react"
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
  // Only read on mount: a turn that is still running opens so its progress shows, and a
  // finished turn starts collapsed.
  defaultOpen: boolean
}

export function ToolChain({ steps, defaultOpen }: ToolChainProps) {
  return (
    <ChainOfThought defaultOpen={defaultOpen}>
      <ChainOfThoughtHeader>Tools</ChainOfThoughtHeader>
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