import type { Meta, StoryObj } from "@storybook/react-vite"
import { FileTextIcon, SearchIcon, TerminalIcon } from "lucide-react"
import { ToolChain } from "@/features/transcript/message-list/assistant-turn/tool-chain/tool-chain"

const meta = {
  title: "Features/Transcript/ToolChain",
  component: ToolChain,
  args: {
    steps: [
      { id: "s1", icon: TerminalIcon, label: "Ran command", active: false, error: false, output: "Tests: 42 passed" },
      { id: "s2", icon: SearchIcon, label: "Searched files", active: false, error: false, output: null },
      { id: "s3", icon: FileTextIcon, label: "Read types.ts", active: true, error: false, output: "export type AppMeta = {...}" },
    ],
  },
} satisfies Meta<typeof ToolChain>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Failed: Story = {
  args: {
    steps: [{ id: "s1", icon: TerminalIcon, label: "Command failed", active: false, error: true, output: "Error: 1 test failed" }],
  },
}
