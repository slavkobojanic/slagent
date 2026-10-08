import type { Meta, StoryObj } from "@storybook/react-vite"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const meta = {
  title: "Components/Collapsible",
  component: Collapsible,
  render: (args) => (
    <Collapsible {...args} className="w-72">
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
        <span>Show output</span>
        <span aria-hidden="true">v</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">
        The command finished with exit code 0.
      </CollapsibleContent>
    </Collapsible>
  ),
} satisfies Meta<typeof Collapsible>

export default meta
type Story = StoryObj<typeof meta>

export const Closed: Story = {}

export const Open: Story = { args: { defaultOpen: true } }
