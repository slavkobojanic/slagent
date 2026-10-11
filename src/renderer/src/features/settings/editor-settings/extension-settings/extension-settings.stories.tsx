import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ExtensionSettings } from "@/features/settings/editor-settings/extension-settings/extension-settings"

const hit = { id: "redhat.java", name: "Language Support for Java", description: "Java linting, IntelliSense and refactoring.", downloads: 43000000, downloadsLabel: "43.0M", verified: true, installed: false, busy: false }

const meta = {
  title: "Features/Settings/EditorSettings/ExtensionSettings",
  component: ExtensionSettings,
  args: {
    vimOn: false,
    vimBusy: false,
    installed: [],
    query: "",
    results: [],
    searching: false,
    searched: false,
    canSearch: false,
    error: null,
    onVim: fn(),
    onToggle: fn(),
    onUninstall: fn(),
    onQuery: fn(),
    onSearch: fn(),
    onInstall: fn(),
  },
} satisfies Meta<typeof ExtensionSettings>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const VimOn: Story = { args: { vimOn: true } }

export const VimInstalling: Story = { args: { vimBusy: true } }

export const WithInstalled: Story = { args: { installed: [{ id: "redhat.java", version: "1.57.0", enabled: true, busy: false }, { id: "dracula-theme.theme-dracula", version: "2.25.1", enabled: false, busy: false }] } }

export const Searching: Story = { args: { query: "java", searching: true, canSearch: false } }

export const Results: Story = { args: { query: "java", canSearch: true, searched: true, results: [hit, { ...hit, id: "a.b", name: "Another", verified: false, installed: true }, { ...hit, id: "c.d", name: "Third", busy: true }] } }

export const NoResults: Story = { args: { query: "zzzz", canSearch: true, searched: true } }

export const WithError: Story = { args: { error: "The registry answered 500." } }
