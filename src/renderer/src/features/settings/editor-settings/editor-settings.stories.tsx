import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { EditorSettings } from "@/features/settings/editor-settings/editor-settings"
import { slot } from "@/storybook/slots"

const meta = {
  title: "Features/Settings/EditorSettings",
  component: EditorSettings,
  args: {
    fontSize: 13,
    tabSize: 2,
    wordWrap: false,
    minimap: false,
    packs: [
      { id: "typescript-basics", label: "TypeScript", languages: "TypeScript, TSX", enabled: true },
      { id: "json", label: "JSON", languages: "JSON, JSONC", enabled: true },
      { id: "java", label: "Java", languages: "Java", enabled: false },
      { id: "rust", label: "Rust", languages: "Rust", enabled: false },
    ],
    Extensions: slot("Extensions"),
    error: null,
    onFontSize: fn(),
    onTabSize: fn(),
    onWordWrap: fn(),
    onMinimap: fn(),
    onTogglePack: fn(),
  },
} satisfies Meta<typeof EditorSettings>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WrapAndMinimapOn: Story = { args: { wordWrap: true, minimap: true } }

export const WithError: Story = { args: { error: "Could not reach the app." } }
