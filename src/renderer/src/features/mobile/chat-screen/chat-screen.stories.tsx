import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { MobileChatScreen } from "@/features/mobile/chat-screen/chat-screen"
import { fill, slot } from "@/storybook/slots"

const meta = {
  title: "Features/Mobile/ChatScreen",
  component: MobileChatScreen,
  args: {
    title: "Add iOS support",
    projectName: "slagent",
    ready: true,
    metaError: null,
    onBack: fn(),
    onOpenConnection: fn(),
    Banner: () => null,
    Transcript: fill("Transcript"),
    Composer: slot("Composer"),
    PlanOverlay: () => null,
  },
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <div className="h-screen max-w-sm">{Story()}</div>],
} satisfies Meta<typeof MobileChatScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Starting: Story = { args: { ready: false } }

export const NoProject: Story = { args: { title: "Plan the trip", projectName: null } }

export const MetaError: Story = { args: { metaError: "Pi failed to start" } }
