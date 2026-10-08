import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { PanelToggle } from "@/features/shell/shell-header/panel-toggle/panel-toggle"

const meta = {
  title: "Features/Shell/PanelToggle",
  component: PanelToggle,
  args: { open: true, title: "Show changes", disabled: false, onToggle: fn() },
} satisfies Meta<typeof PanelToggle>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {}

export const Closed: Story = { args: { open: false } }

export const Disabled: Story = { args: { disabled: true } }
