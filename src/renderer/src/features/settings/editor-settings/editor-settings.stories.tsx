import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { EditorSettings } from "@/features/settings/editor-settings/editor-settings"

const meta = {
  title: "Features/Settings/EditorSettings",
  component: EditorSettings,
  args: {
    fontSize: 13,
    tabSize: 2,
    wordWrap: false,
    minimap: false,
    error: null,
    onFontSize: fn(),
    onTabSize: fn(),
    onWordWrap: fn(),
    onMinimap: fn(),
  },
} satisfies Meta<typeof EditorSettings>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WrapAndMinimapOn: Story = { args: { wordWrap: true, minimap: true } }

export const WithError: Story = { args: { error: "Could not reach the app." } }
