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
  summary?: string
  open: boolean
  onOpenChange: (value: boolean | null) => void
  onAnyActiveChange?: (anyActive: boolean) => void
  getStepExpanded: (stepId: string) => boolean
  onToggleStep: (stepId: string, output: boolean, active: boolean, error: boolean) => void
}

export function ToolChain({ steps, summary, open, onOpenChange, onAnyActiveChange, getStepExpanded, onToggleStep }: ToolChainProps) {
  const anyActive = steps.some((step) => step.active)
  // The host settles a chain that mounted while a step ran closed once the steps go quiet, and
  // this is where it learns whether a step still runs.
  onAnyActiveChange?.(anyActive)

  return (
    <ChainOfThought open={open} onOpenChange={onOpenChange}>
      <ChainOfThoughtHeader>{summary ? <span className="animate-in fade-in-0 duration-500">{summary}</span> : "Tools"}</ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        {steps.map((step) => {
          const expanded = getStepExpanded(step.id)
          const showOutput = step.active || step.error || expanded
          return (
            <ChainOfThoughtStep
              key={step.id}
              icon={step.icon}
              label={step.label}
              status={step.active ? "active" : "complete"}
              className={cn(step.error && "text-destructive", step.output && !step.active && !step.error && "cursor-pointer")}
              onClick={() => onToggleStep(step.id, !!step.output, step.active, step.error)}
            >
              {showOutput ? step.output : null}
            </ChainOfThoughtStep>
          )
        })}
      </ChainOfThoughtContent>
    </ChainOfThought>
  )
}
