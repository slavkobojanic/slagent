import type { Meta, StoryObj } from "@storybook/react-vite"
import { Field } from "@/features/settings/personalisation-settings/field/field"
import { Input } from "@/components/ui/input"

const meta = {
  title: "Features/Settings/Field",
  component: Field,
  args: { label: "Reply language", children: <Input placeholder="Auto — match your messages" /> },
} satisfies Meta<typeof Field>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
