import type { Meta, StoryObj } from "@storybook/react-vite"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const meta = {
  title: "Components/Dialog",
  component: Dialog,
  render: (args) => (
    <Dialog {...args}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete chat?</DialogTitle>
          <DialogDescription>This removes the chat and its transcript. It cannot be undone.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <button type="button" className="rounded-md px-3 py-1.5 text-sm hover:bg-white/10">
            Cancel
          </button>
          <button type="button" className="rounded-md bg-destructive px-3 py-1.5 text-sm text-white">
            Delete
          </button>
        </div>
      </DialogContent>
    </Dialog>
  ),
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = { args: { open: true } }

export const WithoutCloseButton: Story = {
  args: { open: true },
  render: (args) => (
    <Dialog {...args}>
      <DialogContent hideClose>
        <DialogHeader>
          <DialogTitle>Remove project?</DialogTitle>
          <DialogDescription>Type the project name to confirm.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  ),
}
