import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ToolLabel } from "@/features/transcript/message-list/assistant-turn/tool-chain/tool-label"

const meta = {
  title: "Features/Transcript/ToolLabel",
  component: ToolLabel,
  args: { label: { kind: "text", text: "Ran command" }, onOpenFile: fn() },
} satisfies Meta<typeof ToolLabel>

export default meta
type Story = StoryObj<typeof meta>

export const Text: Story = {}

export const File: Story = { args: { label: { kind: "file", name: "read", path: "src/shared/types.ts" } } }
