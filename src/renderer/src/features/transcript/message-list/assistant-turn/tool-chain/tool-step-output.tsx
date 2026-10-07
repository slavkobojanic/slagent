import type { StepOutput } from "@/features/transcript/message-list/assistant-turn/tool-chain/tool-facts"
import { AnsweredQuestions } from "./answered-questions"
import { BashOutput } from "./bash-output"
import { ToolOutput } from "./tool-output"

export type ToolStepOutputProps = {
  output: StepOutput
}

export function ToolStepOutput({ output }: ToolStepOutputProps) {
  if (output.kind === "bash") {
    return <BashOutput command={output.command} output={output.output} running={output.running} isError={output.isError} />
  }
  if (output.kind === "answers") {
    return <AnsweredQuestions answers={output.answers} />
  }
  return <ToolOutput images={output.images} output={output.output} isError={output.isError} />
}
