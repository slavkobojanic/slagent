import type { Meta, StoryObj } from "@storybook/react-vite"
import { McpStateBadge } from "@/features/settings/mcp-settings/mcp-server-list/mcp-server-row/mcp-state-badge/mcp-state-badge"

const meta = {
  title: "Features/Settings/McpStateBadge",
  component: McpStateBadge,
} satisfies Meta<typeof McpStateBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Connected: Story = { args: { state: "connected" } }

export const NeedsAuth: Story = { args: { state: "needs-auth" } }

export const Failing: Story = { args: { state: "error" } }

export const Disabled: Story = { args: { state: "disabled" } }
