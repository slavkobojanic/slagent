import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import type { UsageStats } from "@shared/types"
import { UsageSettings } from "@/features/settings/usage-settings/usage-settings"

const empty: UsageStats = {
  days: [],
  cumulative: [],
  totalTokens: 0,
  totalCost: 0,
  totalTurns: 0,
  models: [],
  importing: true,
}

const importing: UsageStats = {
  days: [{ day: "2026-10-08", tokens: 240_000, cost: 1.2 }],
  cumulative: [{ day: "2026-10-08", cost: 1.2 }],
  totalTokens: 240_000,
  totalCost: 1.2,
  totalTurns: 3,
  models: [{ model: "claude-sonnet-4-5", provider: "anthropic", input: 90_000, output: 12_000, cacheRead: 120_000, cacheWrite: 18_000, cost: 1.2, turns: 3 }],
  importing: true,
}

const full: UsageStats = {
  days: [
    { day: "2026-09-24", tokens: 120_000, cost: 0.6 },
    { day: "2026-09-25", tokens: 340_000, cost: 1.8 },
    { day: "2026-09-28", tokens: 1_200_000, cost: 6.4 },
    { day: "2026-09-29", tokens: 800_000, cost: 4.2 },
    { day: "2026-10-02", tokens: 2_100_000, cost: 11.9 },
    { day: "2026-10-03", tokens: 460_000, cost: 2.3 },
    { day: "2026-10-06", tokens: 3_400_000, cost: 18.6 },
    { day: "2026-10-07", tokens: 1_050_000, cost: 5.7 },
    { day: "2026-10-08", tokens: 2_400_000, cost: 13.1 },
  ],
  cumulative: [
    { day: "2026-09-24", cost: 0.6 },
    { day: "2026-09-25", cost: 2.4 },
    { day: "2026-09-28", cost: 8.8 },
    { day: "2026-09-29", cost: 13.0 },
    { day: "2026-10-02", cost: 24.9 },
    { day: "2026-10-03", cost: 27.2 },
    { day: "2026-10-06", cost: 45.8 },
    { day: "2026-10-07", cost: 51.5 },
    { day: "2026-10-08", cost: 64.6 },
  ],
  totalTokens: 11_770_000,
  totalCost: 64.6,
  totalTurns: 412,
  models: [
    { model: "claude-opus-5-5", provider: "anthropic", input: 8_130, output: 250_818, cacheRead: 9_000_000, cacheWrite: 860_488, cost: 31.0, turns: 180 },
    { model: "z-ai/glm-5.3-flash", provider: "openrouter", input: 1_500_000, output: 160_000, cacheRead: 1_100_000, cacheWrite: 40_000, cost: 21.4, turns: 200 },
    { model: "claude-sonnet-4-5", provider: "anthropic", input: 60_000, output: 30_000, cacheRead: 300_000, cacheWrite: 12_000, cost: 8.9, turns: 26 },
    { model: "gpt-5-codex", provider: "openrouter", input: 90_000, output: 8_000, cacheRead: 20_000, cacheWrite: 5_000, cost: 3.3, turns: 6 },
  ],
  importing: false,
}

const meta = {
  title: "Features/Settings/UsageSettings",
  component: UsageSettings,
  args: {
    metric: "tokens",
    sort: { key: "cost", dir: "desc" },
    onMetric: fn(),
    onSort: fn(),
  },
} satisfies Meta<typeof UsageSettings>

export default meta
type Story = StoryObj<typeof meta>

export const Loading: Story = { args: { stats: null, cells: [], sortedModels: [] } }

export const Empty: Story = { args: { stats: empty, cells: [], sortedModels: [] } }

export const Importing: Story = {
  args: {
    stats: importing,
    cells: Array.from({ length: 371 }, (_, index) => ({ day: `2026-${String(1 + (index % 12)).padStart(2, "0")}-01`, value: index === 370 ? 240_000 : 0, level: index === 370 ? 3 : 0 })),
    sortedModels: importing.models,
  },
}

export const Full: Story = {
  args: {
    stats: full,
    cells: Array.from({ length: 371 }, (_, index) => {
      const levels = [0, 1, 2, 3, 4]
      const value = index % 7 === 6 ? 0 : index % 5
      return { day: `2026-${String(1 + (index % 12)).padStart(2, "0")}-${String(1 + (index % 28)).padStart(2, "0")}`, value, level: levels[value % 5]! }
    }),
    sortedModels: full.models,
  },
}

export const Dollars: Story = { args: { ...Full.args, metric: "dollars" } }