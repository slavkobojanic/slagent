import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { Connect } from "@/features/mobile/connect/connect"

const meta = {
  title: "Features/Mobile/Connect",
  component: Connect,
  args: { text: "", busy: false, canConnect: false, error: null, onTextChange: fn(), onSubmit: fn() },
  decorators: [(Story) => <div className="max-w-sm">{Story()}</div>],
} satisfies Meta<typeof Connect>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Filled: Story = { args: { text: "ws://100.64.0.1:8747?token=abc", canConnect: true } }

export const Connecting: Story = { args: { text: "ws://100.64.0.1:8747?token=abc", busy: true } }

export const Error: Story = {
  args: {
    text: "ws://100.64.0.1:8747?token=abc",
    canConnect: true,
    error: "Couldn't reach slagent at 100.64.0.1:8747. Check that it is open on your Mac and that both devices are on Tailscale.",
  },
}
