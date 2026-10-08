import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ExcerptCard } from "@/features/transcript/commentable-response/commentable-block/excerpt-card/excerpt-card"
import { replyComment } from "@/storybook/sample"

const meta = {
  title: "Features/Transcript/ExcerptCard",
  component: ExcerptCard,
  args: { comment: replyComment(), top: 80, left: 240, onEnter: fn(), onLeave: fn(), onEdit: fn(), onDelete: fn() },
  render: (args) => (
    <div className="relative h-56 w-96 rounded-md border border-border bg-background p-3 text-sm">
      The assistant reply text with a commented excerpt.
      <ExcerptCard {...args} />
    </div>
  ),
} satisfies Meta<typeof ExcerptCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const NearLeftEdge: Story = { args: { left: 20 } }
