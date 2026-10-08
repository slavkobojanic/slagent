import type { Meta, StoryObj } from "@storybook/react-vite"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const meta = {
  title: "Components/Select",
  component: Select,
  render: (args) => (
    <Select {...args}>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Choose a model" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="sonnet">Claude Sonnet 4</SelectItem>
        <SelectItem value="opus">Claude Opus 4</SelectItem>
        <SelectItem value="haiku">Claude Haiku 4</SelectItem>
      </SelectContent>
    </Select>
  ),
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

export const Placeholder: Story = {}

export const Selected: Story = { args: { defaultValue: "sonnet" } }

export const Open: Story = { args: { defaultOpen: true, defaultValue: "sonnet" } }

export const Small: Story = {
  args: { defaultValue: "sonnet" },
  render: (args) => (
    <Select {...args}>
      <SelectTrigger size="sm" className="w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="sonnet">Claude Sonnet 4</SelectItem>
      </SelectContent>
    </Select>
  ),
}
