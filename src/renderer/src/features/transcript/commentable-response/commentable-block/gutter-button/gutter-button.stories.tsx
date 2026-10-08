import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { GutterButton } from "@/features/transcript/commentable-response/commentable-block/gutter-button/gutter-button"

const meta = {
  title: "Features/Transcript/GutterButton",
  component: GutterButton,
  args: { onClick: fn() },
  render: (args) => (
    <div className="group/reply relative ml-8 w-64 rounded-md border border-border p-3 text-sm">
      Hover this reply.
      <GutterButton {...args} />
    </div>
  ),
} satisfies Meta<typeof GutterButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
