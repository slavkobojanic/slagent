import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { SearchResults } from "@/features/library/sidebar/chat-search/search-results/search-results"
import { searchResult } from "@/storybook/sample"

const results = [
  searchResult(),
  searchResult({ chatId: "c2", title: "Fix the sidebar throb", projectName: "website", snippet: "The status dot should fade while growing." }),
]

const meta = {
  title: "Features/Library/SearchResults",
  component: SearchResults,
  args: { results, openChatId: null, onOpen: fn() },
} satisfies Meta<typeof SearchResults>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Active: Story = { args: { openChatId: "c2" } }

export const NoMatches: Story = { args: { results: [] } }
