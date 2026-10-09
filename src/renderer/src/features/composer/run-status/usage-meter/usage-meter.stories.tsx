import type { Meta, StoryObj } from "@storybook/react-vite"
import { UsageMeter } from "@/features/composer/run-status/usage-meter/usage-meter"

const usage = {
  ringPercent: 21,
  level: "normal" as const,
  percentText: "21%",
  costText: "$0.42",
  ariaLabel: "Context 21 percent used",
  contextText: "42,000 of 200,000 tokens used",
  rows: [
    { label: "This chat", value: "15,500 tokens" },
    { label: "Tokens", value: "12,400 in · 3,100 out" },
    { label: "All chats", value: "120,000 tokens" },
  ],
}

const meta = {
  title: "Features/Composer/UsageMeter",
  component: UsageMeter,
  args: { usage },
} satisfies Meta<typeof UsageMeter>

export default meta
type Story = StoryObj<typeof meta>

export const Normal: Story = {}

export const Warning: Story = { args: { usage: { ...usage, ringPercent: 75, level: "warning", percentText: "75%" } } }

export const Critical: Story = { args: { usage: { ...usage, ringPercent: 95, level: "critical", percentText: "95%" } } }

export const Hidden: Story = { args: { usage: null } }
