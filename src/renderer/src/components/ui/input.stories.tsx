import type { Meta, StoryObj } from "@storybook/react-vite"
import { Input } from "@/components/ui/input"

const meta = {
  title: "Components/Input",
  component: Input,
  args: { placeholder: "Type here" },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithValue: Story = { args: { defaultValue: "feat-storybook-stories" } }

export const Disabled: Story = { args: { disabled: true, defaultValue: "Read only" } }

export const Invalid: Story = { args: { "aria-invalid": true, defaultValue: "not a folder" } }
