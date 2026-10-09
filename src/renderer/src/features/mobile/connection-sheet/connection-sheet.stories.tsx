import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ConnectionSheet } from "@/features/mobile/connection-sheet/connection-sheet"
import { slot } from "@/storybook/slots"

const meta = {
  title: "Features/Mobile/ConnectionSheet",
  component: ConnectionSheet,
  args: {
    open: true,
    online: true,
    label: "Work Mac",
    renaming: false,
    draftNickname: "",
    onRenameStart: fn(),
    onRenameChange: fn(),
    onRenameSave: fn(),
    onRenameCancel: fn(),
    onOpenChange: fn(),
    onForget: fn(),
    Connect: slot("Connect"),
  },
} satisfies Meta<typeof ConnectionSheet>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Offline: Story = { args: { online: false } }

export const Renaming: Story = { args: { renaming: true, draftNickname: "Work" } }
