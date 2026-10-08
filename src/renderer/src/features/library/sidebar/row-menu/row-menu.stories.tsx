import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { RowMenu } from "@/features/library/sidebar/row-menu/row-menu"

const meta = {
  title: "Features/Library/RowMenu",
  component: RowMenu,
  args: {
    label: "Chat actions",
    open: true,
    onOpenChange: fn(),
    children: (
      <>
        <DropdownMenuItem>Pin</DropdownMenuItem>
        <DropdownMenuItem>Rename</DropdownMenuItem>
        <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
      </>
    ),
  },
} satisfies Meta<typeof RowMenu>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {}

export const Closed: Story = { args: { open: false } }
