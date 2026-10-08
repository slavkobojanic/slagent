import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { McpSettings } from "@/features/settings/mcp-settings/mcp-settings"
import { slot } from "@/storybook/slots"

const meta = {
  title: "Features/Settings/McpSettings",
  component: McpSettings,
  args: { refreshing: false, error: null, onRefresh: fn(), McpServerList: slot("McpServerList") },
} satisfies Meta<typeof McpSettings>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Refreshing: Story = { args: { refreshing: true } }

export const Error: Story = { args: { error: "Could not reach the MCP servers." } }
