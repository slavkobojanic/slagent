import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { PromptForm } from "@/features/composer/prompt-form/prompt-form"
import { slot } from "@/storybook/slots"

const meta = {
  title: "Features/Composer/PromptForm",
  component: PromptForm,
  parameters: { layout: "fullscreen" },
  args: {
    Attachments: slot("Attachments"),
    PromptTextarea: slot("PromptTextarea"),
    AttachButton: slot("AttachButton"),
    PlanToggle: slot("PlanToggle"),
    SubmitButton: slot("SubmitButton"),
    UsageMeter: slot("UsageMeter"),
    onSubmit: fn(),
    onDragOver: fn(),
    onDrop: fn(),
  },
} satisfies Meta<typeof PromptForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
