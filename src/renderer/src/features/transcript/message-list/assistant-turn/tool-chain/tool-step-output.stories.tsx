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

const runs = [
  {
    agent: "explore",
    task: "Find where the settings panel is rendered",
    steps: ["grep SettingsPanel", "read settings-panel.tsx", "grep settings-store"],
    state: "done",
    error: null,
  },
  {
    agent: "general",
    task: "Add the About page",
    steps: ["write about-page.tsx", "edit routes.ts"],
    state: "edit routes.ts",
    error: null,
  },
]

export const SubagentRunsRunning: Story = {
  args: { output: { kind: "subagent", runs, running: true } },
}

export const SubagentRunsDone: Story = {
  args: {
    output: {
      kind: "subagent",
      runs: [...runs.slice(0, 1), { ...runs[1], steps: [...runs[1].steps, "edit routes.ts"], state: "done" }],
      running: false,
    },
  },
}

export const SubagentRunsFailed: Story = {
  args: {
    output: { kind: "subagent", runs: [{ ...runs[0], error: "No agent named scout." }], running: false },
  },
}
