import type { Meta, StoryObj } from "@storybook/react-vite"
import { MobileShell } from "@/features/mobile/mobile-shell"
import { fill } from "@/storybook/slots"

const meta = {
  title: "Features/Mobile/MobileShell",
  component: MobileShell,
  args: { screen: "chats", ChatList: fill("ChatList"), ChatScreen: fill("ChatScreen"), ConnectionSheet: () => null },
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <div className="h-screen max-w-sm">{Story()}</div>],
} satisfies Meta<typeof MobileShell>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Chat: Story = { args: { screen: "chat" } }
