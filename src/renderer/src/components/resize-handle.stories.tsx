import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ResizeHandle } from "@/components/resize-handle"

const meta = {
  title: "Components/ResizeHandle",
  component: ResizeHandle,
  args: { edge: "sidebar", resizing: false, onResizeStart: fn(), onResizeReset: fn() },
  render: (args) => (
    <div className="relative h-64 w-48 rounded-md border border-border bg-background">
      <ResizeHandle {...args} />
    </div>
  ),
} satisfies Meta<typeof ResizeHandle>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const DiffEdge: Story = { args: { edge: "diff" } }

export const Resizing: Story = { args: { resizing: true } }
