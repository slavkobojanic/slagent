import type { Meta, StoryObj } from "@storybook/react-vite"
import { SearchIcon } from "lucide-react"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea } from "@/components/ui/input-group"

const meta = {
  title: "Components/InputGroup",
  component: InputGroup,
  render: (args) => (
    <InputGroup {...args} className="w-80">
      <InputGroupAddon>
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput placeholder="Search chats" />
    </InputGroup>
  ),
} satisfies Meta<typeof InputGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const InlineEnd: Story = {
  render: () => (
    <InputGroup className="w-80">
      <InputGroupInput placeholder="OpenRouter API key" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton>Save</InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
}

export const BlockStart: Story = {
  render: () => (
    <InputGroup className="w-80">
      <InputGroupAddon align="block-start">
        <InputGroupText>Comment</InputGroupText>
      </InputGroupAddon>
      <InputGroupTextarea placeholder="Write a comment" />
    </InputGroup>
  ),
}

export const Invalid: Story = {
  render: () => (
    <InputGroup className="w-80">
      <InputGroupAddon>@</InputGroupAddon>
      <InputGroupInput aria-invalid defaultValue="not a handle" />
    </InputGroup>
  ),
}
