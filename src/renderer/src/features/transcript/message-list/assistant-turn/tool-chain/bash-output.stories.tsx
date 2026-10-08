import type { Meta, StoryObj } from "@storybook/react-vite"
import { BashOutput } from "@/features/transcript/message-list/assistant-turn/tool-chain/bash-output"

const meta = {
  title: "Features/Transcript/BashOutput",
  component: BashOutput,
  args: { command: "pnpm test", output: "", running: true, isError: false },
} satisfies Meta<typeof BashOutput>

export default meta
type Story = StoryObj<typeof meta>

export const Running: Story = {}

export const Finished: Story = {
  args: { running: false, output: "PASS src/renderer/src/components/ui/button.test.tsx\nTests: 42 passed\nTime: 3.1s" },
}

export const Failed: Story = { args: { running: false, isError: true, output: "Error: 1 test failed" } }
