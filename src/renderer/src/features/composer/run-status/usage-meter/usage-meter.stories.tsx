import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { UsageMeter } from "@/features/composer/run-status/usage-meter/usage-meter"

const usage = {
  ringPercent: 21,
  level: "normal" as const,
  percentText: "21%",
  costText: "$0.42",
  ariaLabel: "Context 21 percent used",
  contextText: "42,000 of 200,000 tokens used",
  thisChatText: "This chat: 15,500 tokens",
  tokensText: "12,400 in, 3,100 out",
  allChatsText: "All chats: 120,000 tokens",
  canCompact: true,
}

const meta = {
  title: "Features/Composer/UsageMeter",
  component: UsageMeter,
  args: { usage, error: null, onCompact: fn() },
} satisfies Meta<typeof UsageMeter>

export default meta
type Story = StoryObj<typeof meta>

export const Normal: Story = {}

export const Warning: Story = { args: { usage: { ...usage, ringPercent: 75, level: "warning", percentText: "75%" } } }

export const Critical: Story = { args: { usage: { ...usage, ringPercent: 95, level: "critical", percentText: "95%" } } }

export const Error: Story = { args: { error: "Could not summarize earlier messages." } }

export const Hidden: Story = { args: { usage: null } }
