import type { Meta, StoryObj } from "@storybook/react-vite"
import { ChatTitle } from "@/features/shell/shell-header/chat-title/chat-title"

const meta = {
  title: "Features/Shell/ChatTitle",
  component: ChatTitle,
} satisfies Meta<typeof ChatTitle>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { args: { title: "Set up storybook stories" } }

export const Draft: Story = { args: { title: null } }
