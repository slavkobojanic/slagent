import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { SidebarToggle } from "@/features/shell/shell-header/sidebar-toggle/sidebar-toggle"

const meta = {
  title: "Features/Shell/SidebarToggle",
  component: SidebarToggle,
  args: { open: true, title: "Show sidebar", onToggle: fn() },
} satisfies Meta<typeof SidebarToggle>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {}

export const Closed: Story = { args: { open: false } }
