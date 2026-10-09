import type { Meta, StoryObj } from "@storybook/react-vite"
import { ConnectPage } from "@/features/mobile/connect-page/connect-page"
import { slot } from "@/storybook/slots"

const meta = {
  title: "Features/Mobile/ConnectPage",
  component: ConnectPage,
  args: { Connect: slot("Connect") },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ConnectPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
