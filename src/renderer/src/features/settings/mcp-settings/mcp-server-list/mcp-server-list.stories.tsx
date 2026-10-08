import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { McpServerList } from "@/features/settings/mcp-settings/mcp-server-list/mcp-server-list"
import { mcpServer } from "@/storybook/sample"

const meta = {
  title: "Features/Settings/McpServerList",
  component: McpServerList,
  args: {
    servers: [
      mcpServer(),
      mcpServer({ name: "github", state: "needs-auth", oauth: true, description: "Issues and pull requests", tools: 24 }),
      mcpServer({ name: "sentry", state: "error", detail: "connect ECONNREFUSED" }),
    ],
    busyName: null,
    onSignIn: fn(),
    onSignOut: fn(),
    onSetEnabled: fn(),
  },
} satisfies Meta<typeof McpServerList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = { args: { servers: [] } }

export const Busy: Story = { args: { busyName: "github" } }
