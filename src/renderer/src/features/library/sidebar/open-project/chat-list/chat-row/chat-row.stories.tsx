import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ChatRow } from "@/features/library/sidebar/open-project/chat-list/chat-row/chat-row"
import { chat } from "@/storybook/sample"
import { slot } from "@/storybook/slots"

const meta = {
  title: "Features/Library/ChatRow",
  component: ChatRow,
  args: {
    chat: chat(),
    status: "idle",
    active: false,
    renaming: false,
    onOpen: fn(),
    onContextMenu: fn(),
    Menu: slot("Menu"),
    Rename: slot("Rename"),
  },
} satisfies Meta<typeof ChatRow>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Pinned: Story = { args: { chat: chat({ pinned: true }) } }

export const Active: Story = { args: { active: true } }

export const Running: Story = { args: { status: "running" } }

export const Renaming: Story = { args: { renaming: true } }
