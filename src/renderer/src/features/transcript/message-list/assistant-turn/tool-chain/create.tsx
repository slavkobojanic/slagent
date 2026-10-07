import type { ComponentType } from "react"
import { observer } from "mobx-react-lite"
import type { ToolMessage } from "@shared/types"
import type { PanelPresenter } from "@/state/panel/panel-presenter/panel-presenter"
import { ToolChain } from "./tool-chain"
import { toolIcon, toolLabel, toolStepOutput } from "./tool-facts"
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
    return <ToolChain steps={steps} />
  })
}
