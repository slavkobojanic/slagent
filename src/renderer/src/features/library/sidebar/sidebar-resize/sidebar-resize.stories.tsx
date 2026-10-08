import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { SidebarResize } from "@/features/library/sidebar/sidebar-resize/sidebar-resize"

const meta = {
  title: "Features/Library/SidebarResize",
  component: SidebarResize,
  args: { open: true, resizing: false, onResizeStart: fn(), onResizeReset: fn() },
  render: (args) => (
    <div className="relative h-64 w-48 rounded-md border border-border bg-background">
      <SidebarResize {...args} />
    </div>
  ),
} satisfies Meta<typeof SidebarResize>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {}

export const Resizing: Story = { args: { resizing: true } }

export const Hidden: Story = { args: { open: false } }
