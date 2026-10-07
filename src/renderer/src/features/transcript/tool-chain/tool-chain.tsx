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
}

// The tools a reply ran, as an open chain of steps. A step is active while its tool runs.
export function ToolChain({ steps }: ToolChainProps) {
  return (
    <ChainOfThought defaultOpen>
      <ChainOfThoughtHeader>Tools</ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        {steps.map((step) => (
          <ChainOfThoughtStep
            key={step.id}
            icon={step.icon}
            label={step.label}
            status={step.active ? "active" : "complete"}
            className={cn(step.error && "text-destructive")}
          >
            {step.output}
          </ChainOfThoughtStep>
        ))}
      </ChainOfThoughtContent>
    </ChainOfThought>
  )
}
