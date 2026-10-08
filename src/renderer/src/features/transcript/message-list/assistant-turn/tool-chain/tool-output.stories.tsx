import type { Meta, StoryObj } from "@storybook/react-vite"
import { ToolOutput } from "@/features/transcript/message-list/assistant-turn/tool-chain/tool-output"

const IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='100'%3E%3Crect width='160' height='100' fill='%23333333'/%3E%3C/svg%3E"

const meta = {
  title: "Features/Transcript/ToolOutput",
  component: ToolOutput,
  args: { images: [], output: "export type AppMeta = {...}", isError: false },
} satisfies Meta<typeof ToolOutput>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithImages: Story = { args: { images: [IMAGE], output: "" } }

export const Error: Story = { args: { output: "Error: file not found", isError: true } }

export const Nothing: Story = { args: { output: "" } }
