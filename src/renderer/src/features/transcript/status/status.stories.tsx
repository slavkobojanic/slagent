import type { Meta, StoryObj } from "@storybook/react-vite"
import { Status } from "@/features/transcript/status/status"

const meta = {
  title: "Features/Transcript/Status",
  component: Status,
  args: { pending: false, notice: null },
} satisfies Meta<typeof Status>

export default meta
type Story = StoryObj<typeof meta>

export const Thinking: Story = { args: { pending: true } }

export const Notice: Story = { args: { pending: true, notice: "Compacting earlier messages" } }

export const IdleNotice: Story = { args: { notice: "Stopped by the user" } }

export const Nothing: Story = {}
