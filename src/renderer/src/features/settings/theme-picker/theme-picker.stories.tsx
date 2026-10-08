import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ThemePicker } from "@/features/settings/theme-picker/theme-picker"

const meta = {
  title: "Features/Settings/ThemePicker",
  component: ThemePicker,
  args: { value: "system", onChange: fn() },
} satisfies Meta<typeof ThemePicker>

export default meta
type Story = StoryObj<typeof meta>

export const System: Story = {}

export const Light: Story = { args: { value: "light" } }

export const Dark: Story = { args: { value: "dark" } }
