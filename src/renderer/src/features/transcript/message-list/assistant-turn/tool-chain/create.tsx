import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { ToolMessage } from "@shared/types"
import type { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import { ToolChain } from "./tool-chain"
import { toolDescription, toolIcon, toolLabel, toolStepOutput } from "./tool-facts"
import { ToolLabel } from "./tool-label"
import { ToolStepOutput } from "./tool-step-output"

export function createToolChain({ panelPresenter }: { panelPresenter: PanelPresenter }): ComponentType<{ tools: ToolMessage[] }> {
  return observer(function ToolChainHost({ tools }: { tools: ToolMessage[] }) {
    if (tools.length === 0) {
      return null
    }
    const steps = tools.map((tool) => ({
      id: tool.id,
      icon: toolIcon(tool.name),
      label: <ToolLabel label={toolLabel(tool)} onOpenFile={panelPresenter.openFile} />,
      active: tool.running,
      error: tool.isError,
      output: <ToolStepOutput output={toolStepOutput(tool)} />,
    }))
    return <ToolChain steps={steps} summary={chainSummary(tools)} defaultOpen={tools.some((tool) => tool.running)} />
  })
}

// The collapsed chain reads what the turn did instead of "Tools": the small
// model's descriptions joined, with a held line for steps still being
// described, and nothing when no description has landed yet.
function chainSummary(tools: ToolMessage[]): string | undefined {
  const parts = tools
    .map((tool) => toolDescription(tool) ?? (tool.labelPending ? "···" : null))
    .filter((part): part is string => part !== null)
  if (parts.length === 0) return undefined
  if (parts.length <= 3) return parts.join(", ")
  return `${parts.slice(0, 3).join(", ")} and ${parts.length - 3} more`
}
