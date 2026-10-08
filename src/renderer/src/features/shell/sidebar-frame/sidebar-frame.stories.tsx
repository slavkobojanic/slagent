import type { Meta, StoryObj } from "@storybook/react-vite"
import { SidebarFrame } from "@/features/shell/sidebar-frame/sidebar-frame"
import { fill } from "@/storybook/slots"

const meta = {
  title: "Features/Shell/SidebarFrame",
  component: SidebarFrame,
  parameters: { layout: "fullscreen" },
  args: { open: true, width: 280, resizing: false, Library: fill("Library") },
} satisfies Meta<typeof SidebarFrame>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {}

export const Closed: Story = { args: { open: false } }

export const Resizing: Story = { args: { resizing: true } }
