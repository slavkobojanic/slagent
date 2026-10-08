import type { Meta, StoryObj } from "@storybook/react-vite"
import { Button } from "@/components/ui/button"

const meta = {
  title: "Components/Button",
  component: Button,
  args: { children: "Button", variant: "default", size: "default" },
  argTypes: {
    variant: { control: "inline-radio", options: ["default", "outline", "ghost"] },
    size: { control: "inline-radio", options: ["default", "xs", "sm", "lg", "icon", "icon-xs", "icon-sm", "icon-lg"] },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Outline: Story = { args: { variant: "outline" } }

export const Ghost: Story = { args: { variant: "ghost" } }

export const Disabled: Story = { args: { disabled: true } }

export const Small: Story = { args: { size: "xs" } }

export const Large: Story = { args: { size: "lg" } }
