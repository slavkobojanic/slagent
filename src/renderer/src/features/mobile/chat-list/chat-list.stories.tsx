import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ComponentType } from "react"
import { fn } from "storybook/test"
import { MobileChatList } from "@/features/mobile/chat-list/chat-list"
import { chat } from "@/storybook/sample"
import { slot } from "@/storybook/slots"

const noBanner: ComponentType = () => null

const meta = {
  title: "Features/Mobile/ChatList",
  component: MobileChatList,
  args: {
    groups: [
      {
        id: "chats",
        name: "Chats",
        newChatProjectId: null,
        items: [
          { chat: chat({ id: "c1", title: "Plan the trip", pinned: true }), projectId: "p0", status: "idle" },
          { chat: chat({ id: "c2", title: "Summarise the paper" }), projectId: "p0", status: "done" },
        ],
      },
      {
        id: "p1",
        name: "slagent",
        newChatProjectId: "p1",
        items: [
          { chat: chat({ id: "c3", title: "Add iOS support" }), projectId: "p1", status: "running" },
          { chat: chat({ id: "c4", title: "Fix the flaky test" }), projectId: "p1", status: "waiting" },
        ],
      },
    ],
    empty: false,
    ready: true,
    opening: null,
    error: null,
    onOpenChat: fn(),
    onNewChat: fn(),
    onOpenConnection: fn(),
    onDismissError: fn(),
    Banner: noBanner,
  },
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <div className="h-screen max-w-sm">{Story()}</div>],
} satisfies Meta<typeof MobileChatList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Loading: Story = { args: { ready: false } }

export const Empty: Story = { args: { empty: true, groups: [] } }

export const Opening: Story = { args: { opening: "c3" } }

export const Error: Story = { args: { error: "Chat not found" } }

export const Offline: Story = { args: { Banner: slot("ConnectionBanner") } }
