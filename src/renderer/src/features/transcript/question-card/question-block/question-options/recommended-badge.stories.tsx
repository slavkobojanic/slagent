import type { Meta, StoryObj } from "@storybook/react-vite"
import { RecommendedBadge } from "@/features/transcript/question-card/question-block/question-options/recommended-badge"

const meta = {
  title: "Features/Transcript/RecommendedBadge",
  component: RecommendedBadge,
} satisfies Meta<typeof RecommendedBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
