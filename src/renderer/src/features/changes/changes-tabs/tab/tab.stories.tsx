import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { Tab } from "@/features/changes/changes-tabs/tab/tab"

const meta = {
  title: "Features/Changes/Tab",
  component: Tab,
  args: { active: false, onClick: fn(), children: "Changes" },
} satisfies Meta<typeof Tab>

export default meta
type Story = StoryObj<typeof meta>

export const Inactive: Story = {}

export const Active: Story = { args: { active: true } }
