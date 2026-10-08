import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { CommentableBlock } from "@/features/transcript/commentable-response/commentable-block/commentable-block"

const meta = {
  title: "Features/Transcript/CommentableBlock",
  component: CommentableBlock,
  args: { wrapperRef: fn(), onMouseUp: fn(), onMouseMove: fn(), onMouseLeave: fn(), children: "Hover this reply to reveal the gutter button." },
} satisfies Meta<typeof CommentableBlock>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
