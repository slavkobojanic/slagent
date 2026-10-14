import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ComponentType } from "react"
import { fn } from "storybook/test"
import { MacPicker } from "@/features/mobile/mac-picker/mac-picker"
import { MobileChatList } from "@/features/mobile/chat-list/chat-list"
import { chat } from "@/storybook/sample"
import { slot } from "@/storybook/slots"

const noBanner: ComponentType = () => null

const macPicker: ComponentType = () => (
  <MacPicker
    label="Slavkos-MacBook-Pro"
    online
    servers={[
      { host: "100.64.0.1", port: 8747, token: "t1", name: "Slavkos-MacBook-Pro" },
      { host: "100.64.0.9", port: 8747, token: "t2", name: "Studio-Mac" },
    ]}
    current={{ host: "100.64.0.1", port: 8747, token: "t1" }}
    nicknames={{ "100.64.0.1:8747": "Work" }}
    open={false}
    onOpenChange={fn()}
    onPick={fn()}
  />
)

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
        hiddenCount: 0,
        showAll: false,
        canShowLess: false,
      },
      {
        id: "p1",
        name: "slagent",
        newChatProjectId: "p1",
        items: [
          { chat: chat({ id: "c3", title: "Add iOS support" }), projectId: "p1", status: "running" },
          { chat: chat({ id: "c4", title: "Fix the flaky test" }), projectId: "p1", status: "waiting" },
        ],
        hiddenCount: 0,
        showAll: false,
        canShowLess: false,
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
    MacPicker: macPicker,
    Banner: noBanner,
  },
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <div className="h-screen max-w-sm">{Story()}</div>],
} satisfies Meta<typeof MobileChatList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { args: { onToggleShowAll: fn() } }

export const Loading: Story = { args: { ready: false, onToggleShowAll: fn() } }

export const Empty: Story = { args: { empty: true, groups: [], onToggleShowAll: fn() } }

export const Opening: Story = { args: { opening: "c3", onToggleShowAll: fn() } }

export const Error: Story = { args: { error: "Chat not found", onToggleShowAll: fn() } }

export const PastTheCap: Story = {
  args: {
    groups: [
      {
        id: "p1",
        name: "slagent",
        newChatProjectId: "p1",
        items: Array.from({ length: 10 }, (_, index) => ({
          chat: chat({ id: `c${index}`, title: `Chat ${index + 1}` }),
          projectId: "p1",
          status: "idle" as const,
        })),
        hiddenCount: 3,
        showAll: false,
        canShowLess: false,
      },
    ],
    onToggleShowAll: fn(),
  },
}

export const Offline: Story = { args: { Banner: slot("ConnectionBanner"), onToggleShowAll: fn() } }
