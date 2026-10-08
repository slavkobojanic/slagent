import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { SelectionButton } from "@/features/transcript/commentable-response/commentable-block/selection-button/selection-button"

const meta = {
  title: "Features/Transcript/SelectionButton",
  component: SelectionButton,
  args: { top: 60, left: 140, onClick: fn() },
  render: (args) => (
    <div className="relative h-40 w-80 rounded-md border border-border bg-background p-3 text-sm">
      Selected words sit under the comment button.
      <SelectionButton {...args} />
    </div>
  ),
} satisfies Meta<typeof SelectionButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
