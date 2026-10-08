import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { KeyActions } from "@/features/settings/openrouter-key/key-actions/key-actions"

const meta = {
  title: "Features/Settings/KeyActions",
  component: KeyActions,
  args: { canSave: true, saving: false, canRemove: true, removing: false, oauth: false, onCreateKey: fn(), onRemove: fn() },
} satisfies Meta<typeof KeyActions>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const NothingConfigured: Story = { args: { canSave: false, canRemove: false } }

export const Saving: Story = { args: { saving: true } }

export const OAuth: Story = { args: { oauth: true } }

export const Removing: Story = { args: { removing: true } }
