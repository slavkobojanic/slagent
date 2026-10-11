import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { SettingSwitch } from "@/features/settings/editor-settings/setting-switch/setting-switch"

const meta = {
  title: "Features/Settings/EditorSettings/SettingSwitch",
  component: SettingSwitch,
  args: { label: "Word wrap", description: "Wrap long lines instead of scrolling.", checked: false, onChange: fn() },
} satisfies Meta<typeof SettingSwitch>

export default meta
type Story = StoryObj<typeof meta>

export const Off: Story = {}

export const On: Story = { args: { checked: true } }

export const Disabled: Story = { args: { disabled: true } }
