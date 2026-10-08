import type { Meta, StoryObj } from "@storybook/react-vite"
import { ToolStepOutput } from "@/features/transcript/message-list/assistant-turn/tool-chain/tool-step-output"
import { answeredQuestion } from "@/storybook/sample"

const meta = {
  title: "Features/Transcript/ToolStepOutput",
  component: ToolStepOutput,
  args: { output: { kind: "bash", command: "pnpm test", output: "Tests: 42 passed", running: false, isError: false } },
} satisfies Meta<typeof ToolStepOutput>

export default meta
type Story = StoryObj<typeof meta>

export const Bash: Story = {}

export const Answers: Story = { args: { output: { kind: "answers", answers: [answeredQuestion()] } } }

export const Plain: Story = {
  args: { output: { kind: "output", images: [], output: "export type AppMeta = {...}", isError: false } },
}
