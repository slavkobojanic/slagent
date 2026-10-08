import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { SearchBox } from "@/features/library/sidebar/chat-search/search-box/search-box"

const meta = {
  title: "Features/Library/SearchBox",
  component: SearchBox,
  args: { inputId: "chat-search", query: "", onQueryChange: fn(), onKeyDown: fn(), onClear: fn() },
} satisfies Meta<typeof SearchBox>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}

export const WithQuery: Story = { args: { query: "storybook" } }
