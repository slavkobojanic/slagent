import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { McpServerRow } from "@/features/settings/mcp-settings/mcp-server-list/mcp-server-row/mcp-server-row"
import { mcpServer } from "@/storybook/sample"

const meta = {
  title: "Features/Settings/McpServerRow",
  component: McpServerRow,
  args: { server: mcpServer(), busy: false, onSignIn: fn(), onSignOut: fn(), onToggle: fn() },
  render: (args) => (
    <table className="w-full">
      <tbody>
        <McpServerRow {...args} />
      </tbody>
    </table>
  ),
} satisfies Meta<typeof McpServerRow>

export default meta
type Story = StoryObj<typeof meta>

export const Connected: Story = {}

export const NeedsAuth: Story = { args: { server: mcpServer({ state: "needs-auth", oauth: true }) } }

export const Disabled: Story = { args: { server: mcpServer({ enabled: false, state: "disabled" }) } }

export const Failing: Story = { args: { server: mcpServer({ state: "error", detail: "connect ECONNREFUSED" }) } }

export const Busy: Story = { args: { busy: true } }
