import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { SaveBar } from "@/features/settings/personalisation-settings/save-bar/save-bar"

const meta = {
  title: "Features/Settings/SaveBar",
  component: SaveBar,
  args: { dirty: false, saving: false, canSave: false, error: null, onSave: fn() },
} satisfies Meta<typeof SaveBar>

export default meta
type Story = StoryObj<typeof meta>

export const Clean: Story = {}

export const Dirty: Story = { args: { dirty: true, canSave: true } }

export const Saving: Story = { args: { saving: true, canSave: false } }

export const Error: Story = { args: { error: "Could not save your preferences." } }
