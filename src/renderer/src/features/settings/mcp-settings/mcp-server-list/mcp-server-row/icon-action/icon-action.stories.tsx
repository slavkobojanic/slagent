import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { Power } from "lucide-react"
import { IconAction } from "@/features/settings/mcp-settings/mcp-server-list/mcp-server-row/icon-action/icon-action"

const meta = {
  title: "Features/Settings/IconAction",
  component: IconAction,
  args: { label: "Enable", disabled: false, onClick: fn(), children: <Power className="size-4" /> },
} satisfies Meta<typeof IconAction>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Disabled: Story = { args: { disabled: true } }
