import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ChatSlot } from "@/features/shell/chat-slot/chat-slot"
import { fill } from "@/storybook/slots"

const meta = {
  title: "Features/Shell/ChatSlot",
  component: ChatSlot,
  parameters: { layout: "fullscreen" },
  args: { editorMode: false, width: 480, resizing: false, MainColumn: fill("MainColumn"), onResizeStart: fn(), onResizeReset: fn() },
} satisfies Meta<typeof ChatSlot>

export default meta
type Story = StoryObj<typeof meta>

export const ChatMode: Story = {}

export const EditorMode: Story = { args: { editorMode: true } }

export const Resizing: Story = { args: { editorMode: true, resizing: true } }
