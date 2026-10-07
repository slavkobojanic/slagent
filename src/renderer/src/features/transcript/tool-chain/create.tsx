import type { ReactElement } from "react"
import type { ToolMessage } from "@shared/types"
import { AnsweredQuestions } from "@/features/transcript/tool-chain/answered-questions"
import { BashOutput } from "@/features/transcript/tool-chain/bash-output"
import { bashCommand, toolIcon, toolLabel, toolOutputKind } from "@/features/transcript/tool-chain/tool-facts"
import { ToolChain, type ToolStepProps } from "@/features/transcript/tool-chain/tool-chain"
import { ToolLabel } from "@/features/transcript/tool-chain/tool-label"
import { ToolOutput } from "@/features/transcript/tool-chain/tool-output"

// Builds the tool chain for one turn. Returns null when no tool ran.
export function createToolChain({ tools, onOpenFile }: { tools: ToolMessage[]; onOpenFile: (path: string) => void }): ReactElement | null {
  if (tools.length === 0) {
    return null
  }
  const steps: ToolStepProps[] = tools.map((tool) => ({
    id: tool.id,
    icon: toolIcon(tool.name),
    label: createToolLabel(tool, onOpenFile),
    active: tool.running,
    error: tool.isError,
    output: createToolOutput(tool),
  }))
  return <ToolChain steps={steps} />
}

function createToolLabel(tool: ToolMessage, onOpenFile: (path: string) => void): ReactElement {
  const label = toolLabel(tool)
  if (label.kind === "text") {
    return <ToolLabel text={label.text} file={null} onOpenFile={onOpenFile} />
  }
  return <ToolLabel text="" file={{ name: label.name, path: label.path }} onOpenFile={onOpenFile} />
}

function createToolOutput(tool: ToolMessage): ReactElement {
  const kind = toolOutputKind(tool)
  if (kind === "bash") {
    return <BashOutput command={bashCommand(tool)} output={tool.output} running={tool.running} isError={tool.isError} />
  }
  if (kind === "answers") {
    return <AnsweredQuestions answers={tool.answers ?? []} />
  }
  return <ToolOutput images={tool.images ?? []} output={tool.output} isError={tool.isError} />
}
