import type { Meta, StoryObj } from "@storybook/react-vite"
import { Composer } from "@/features/composer/composer"
import { slot } from "@/storybook/slots"

const meta = {
  title: "Features/Composer/Composer",
  component: Composer,
  parameters: { layout: "fullscreen" },
  args: {
    RunStatus: slot("RunStatus"),
    PendingComments: slot("PendingComments"),
    PromptHistory: slot("PromptHistory"),
    Suggestions: slot("Suggestions"),
    FileInput: slot("FileInput"),
    PromptForm: slot("PromptForm"),
  },
} satisfies Meta<typeof Composer>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
