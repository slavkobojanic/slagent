import type { Meta, StoryObj } from "@storybook/react-vite"
import { Textarea } from "@/components/ui/textarea"

const meta = {
  title: "Components/Textarea",
  component: Textarea,
  args: { placeholder: "Type here" },
} satisfies Meta<typeof Textarea>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithValue: Story = { args: { defaultValue: "Add stories for every component." } }

export const Disabled: Story = { args: { disabled: true, defaultValue: "Read only" } }

export const Invalid: Story = { args: { "aria-invalid": true, defaultValue: "Missing" } }
