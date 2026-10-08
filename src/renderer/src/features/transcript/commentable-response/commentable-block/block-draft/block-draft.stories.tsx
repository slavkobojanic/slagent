import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { BlockDraft } from "@/features/transcript/commentable-response/commentable-block/block-draft/block-draft"

const meta = {
  title: "Features/Transcript/BlockDraft",
  component: BlockDraft,
  args: { initial: "", saveLabel: "Add comment", onSave: fn(), onCancel: fn() },
} satisfies Meta<typeof BlockDraft>

export default meta
type Story = StoryObj<typeof meta>

export const New: Story = {}

export const Editing: Story = { args: { initial: "Use a Set.", saveLabel: "Save" } }
