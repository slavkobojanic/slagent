import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { FileTab } from "@/features/changes/changes-tabs/file-tab/file-tab"

const meta = {
  title: "Features/Changes/FileTab",
  component: FileTab,
  args: { file: { name: "types.ts", path: "src/shared/types.ts" }, active: false, onTab: fn(), onCloseFile: fn() },
} satisfies Meta<typeof FileTab>

export default meta
type Story = StoryObj<typeof meta>

export const Inactive: Story = {}

export const Active: Story = { args: { active: true } }

export const NoFile: Story = { args: { file: null } }
