import type { Meta, StoryObj } from "@storybook/react-vite"
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command"

const meta = {
  title: "Components/Command",
  component: Command,
  render: (args) => (
    <Command {...args} className="w-80 rounded-md border border-border">
      <CommandInput placeholder="Search commands" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Commands">
          <CommandItem>
            Review changes
            <CommandShortcut>Cmd R</CommandShortcut>
          </CommandItem>
          <CommandItem>New chat</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem>Open settings</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
} satisfies Meta<typeof Command>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = {
  render: (args) => (
    <Command {...args} className="w-80 rounded-md border border-border">
      <CommandInput placeholder="Search commands" defaultValue="zzz" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
      </CommandList>
    </Command>
  ),
}

export const Dialog: Story = {
  render: () => (
    <CommandDialog open>
      <CommandInput placeholder="Search commands" />
      <CommandList>
        <CommandGroup heading="Commands">
          <CommandItem>Review changes</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  ),
}
