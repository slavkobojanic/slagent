import type { Meta, StoryObj } from "@storybook/react-vite"
import { ScrollArea } from "@/components/ui/scroll-area"

const meta = {
  title: "Components/ScrollArea",
  component: ScrollArea,
  render: () => (
    <ScrollArea className="h-48 w-64 rounded-md border border-border">
      <div className="flex flex-col gap-2 p-3 text-sm">
        {Array.from({ length: 20 }, (_, index) => (
          <p key={index}>Row {index + 1}</p>
        ))}
      </div>
    </ScrollArea>
  ),
} satisfies Meta<typeof ScrollArea>

export default meta
type Story = StoryObj<typeof meta>

export const Vertical: Story = {}
