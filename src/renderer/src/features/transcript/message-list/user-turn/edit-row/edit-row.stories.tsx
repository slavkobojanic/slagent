import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { EditRow } from "@/features/transcript/message-list/user-turn/edit-row/edit-row"

const meta = {
  title: "Features/Transcript/EditRow",
  component: EditRow,
  args: { draft: "Add storybook stories for every component.", canSave: true, saving: false, onDraftChange: fn(), onCancel: fn(), onSave: fn() },
} satisfies Meta<typeof EditRow>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Blank: Story = { args: { draft: "", canSave: false } }

export const Saving: Story = { args: { saving: true } }
