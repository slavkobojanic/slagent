import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ConnectionBanner } from "@/features/mobile/connection-banner/connection-banner"

const meta = {
  title: "Features/Mobile/ConnectionBanner",
  component: ConnectionBanner,
  args: { online: false, reached: true, label: "100.64.0.1:8747", onOpen: fn() },
} satisfies Meta<typeof ConnectionBanner>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Unreachable: Story = { args: { reached: false } }

export const Online: Story = { args: { online: true } }
