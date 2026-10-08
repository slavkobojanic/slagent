import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { LinkMenu } from "@/features/link-menu/link-menu"

const meta = {
  title: "Features/LinkMenu",
  component: LinkMenu,
  parameters: { layout: "fullscreen" },
  args: {
    url: "https://example.com/docs",
    x: 40,
    y: 40,
    preference: null,
    onOpen: fn(),
    onCopy: fn(),
    onAlwaysOpen: fn(),
    onAlwaysCopy: fn(),
    onAskEveryTime: fn(),
  },
  render: (args) => (
    <div className="relative h-96 bg-background p-8 text-sm text-muted-foreground">
      <p>Right-click or click a web link to choose how it opens.</p>
      <LinkMenu {...args} />
    </div>
  ),
} satisfies Meta<typeof LinkMenu>

export default meta
type Story = StoryObj<typeof meta>

export const Asking: Story = {}

export const RemembersBrowser: Story = { args: { preference: "browser" } }

export const RemembersCopy: Story = { args: { preference: "copy" } }