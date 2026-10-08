import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { SuggestionList } from "@/features/composer/suggestion-list/suggestion-list"

const meta = {
  title: "Features/Composer/SuggestionList",
  component: SuggestionList,
  args: {
    menu: {
      title: "Files",
      empty: null,
      items: [
        { key: "f1", label: "button.tsx", detail: "src/renderer/src/components/ui" },
        { key: "f2", label: "badge.tsx", detail: "src/renderer/src/components/ui" },
        { key: "f3", label: "tokens.ts", detail: "src/shared" },
      ],
    },
    active: 0,
    onHover: fn(),
    onChoose: fn(),
  },
  render: (args) => (
    <div className="relative h-48 w-96">
      <SuggestionList {...args} />
    </div>
  ),
} satisfies Meta<typeof SuggestionList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Active: Story = { args: { active: 1 } }

export const NoMatches: Story = {
  args: { menu: { title: "History", empty: "No matching messages", items: [] } },
}

export const Hidden: Story = { args: { menu: null } }
