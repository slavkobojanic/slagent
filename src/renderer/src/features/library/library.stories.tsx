import type { Meta, StoryObj } from "@storybook/react-vite"
import { Library } from "@/features/library/library"
import { fill, slot } from "@/storybook/slots"

const meta = {
  title: "Features/Library/Library",
  component: Library,
  parameters: { layout: "fullscreen" },
  args: {
    Sidebar: fill("Sidebar"),
    ChatDeletion: slot("ChatDeletion"),
    ProjectRemoval: slot("ProjectRemoval"),
    CommandPalette: slot("CommandPalette"),
  },
} satisfies Meta<typeof Library>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
