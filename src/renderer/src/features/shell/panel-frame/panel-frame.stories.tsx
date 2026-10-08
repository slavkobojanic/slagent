import type { Meta, StoryObj } from "@storybook/react-vite"
import { PanelFrame } from "@/features/shell/panel-frame/panel-frame"
import { fill } from "@/storybook/slots"

const meta = {
  title: "Features/Shell/PanelFrame",
  component: PanelFrame,
  parameters: { layout: "fullscreen" },
  args: { open: true, width: 480, resizing: false, visible: true, Changes: fill("Changes") },
} satisfies Meta<typeof PanelFrame>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {}

export const NoFolder: Story = { args: { visible: false } }

export const Closed: Story = { args: { open: false } }

export const Resizing: Story = { args: { resizing: true } }
