import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { TerminalView } from "@/features/terminal/terminal-view/terminal-view"

const meta = {
  title: "Features/Terminal/TerminalView",
  component: TerminalView,
  parameters: { layout: "fullscreen" },
  args: { active: true, onAttach: fn() },
  render: (args) => (
    <div className="relative h-64 w-full overflow-hidden border border-border bg-background">
      <TerminalView {...args} />
      <p className="absolute inset-0 flex items-center justify-center font-mono text-xs text-muted-foreground">
        {args.active ? "the shell on screen paints here" : "hidden"}
      </p>
    </div>
  ),
} satisfies Meta<typeof TerminalView>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Background: Story = { args: { active: false } }
