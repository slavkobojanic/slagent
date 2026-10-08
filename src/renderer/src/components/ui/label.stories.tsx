import type { Meta, StoryObj } from "@storybook/react-vite"
import { Label } from "@/components/ui/label"

const meta = {
  title: "Components/Label",
  component: Label,
  args: { children: "Branch name" },
} satisfies Meta<typeof Label>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithInput: Story = {
  render: () => (
    <div className="flex w-64 flex-col gap-2">
      <Label htmlFor="branch">Branch name</Label>
      <input id="branch" className="h-9 rounded-md border border-input bg-transparent px-3 text-sm" defaultValue="feat-storybook-stories" />
    </div>
  ),
}
