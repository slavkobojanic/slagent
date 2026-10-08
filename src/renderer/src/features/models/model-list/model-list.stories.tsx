import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ModelList } from "@/features/models/model-list/model-list"
import type { ModelSection } from "@/features/models/model-groups"

const sections: ModelSection[] = [
  {
    provider: "claude-code",
    label: "Claude Code",
    summary: "Runs your Claude Code install with its login.",
    rows: [{ id: "claude-sonnet", name: "Claude Sonnet", provider: "claude-code", detail: "claude-sonnet · 200k", selected: false }],
  },
  {
    provider: "openrouter",
    label: "OpenRouter",
    summary: "Billed per token to your OpenRouter key. 2 models.",
    rows: [
      { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", provider: "openrouter", detail: "anthropic/claude-sonnet-4 · 200k", selected: true },
      { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "openrouter", detail: "google/gemini-2.5-flash · 1M", selected: false },
    ],
  },
]

const meta = {
  title: "Features/Models/ModelList",
  component: ModelList,
  args: { sections, canSelect: true, onSelect: fn() },
} satisfies Meta<typeof ModelList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const NoMatches: Story = { args: { sections: [] } }

export const Disabled: Story = { args: { canSelect: false } }
