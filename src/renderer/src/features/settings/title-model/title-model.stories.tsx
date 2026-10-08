import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { TitleModel } from "@/features/settings/title-model/title-model"

const meta = {
  title: "Features/Settings/TitleModel",
  component: TitleModel,
  args: {
    models: [
      { id: "deepseek/deepseek-v4-flash", name: "DeepSeek V4 Flash" },
      { id: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite" },
    ],
    value: null,
    error: null,
    onValueChange: fn(),
  },
} satisfies Meta<typeof TitleModel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Chosen: Story = { args: { value: "deepseek/deepseek-v4-flash" } }

export const Error: Story = { args: { error: "Could not save the naming model." } }
