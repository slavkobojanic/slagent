import type { Meta, StoryObj } from "@storybook/react-vite"
import { MobileShell } from "@/features/mobile/mobile"
import { fill } from "@/storybook/slots"

const meta = {
  title: "Features/Mobile/MobileShell",
  component: MobileShell,
  args: {
    screen: "chats",
    current: "chats",
    leaving: null,
    direction: "push",
    entering: false,
    onScreenChange: () => undefined,
    ChatList: fill("ChatList"),
    ChatScreen: fill("ChatScreen"),
    ChangesScreen: fill("ChangesScreen"),
    ConnectionSheet: () => null,
    BackSwipe: () => null,
  },
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <div className="h-screen max-w-sm">{Story()}</div>],
} satisfies Meta<typeof MobileShell>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Chat: Story = { args: { screen: "chat", current: "chat", BackSwipe: () => null } }

export const Changes: Story = { args: { screen: "changes", current: "changes", BackSwipe: () => null } }
