import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { EMPTY_PERSONALISATION, type Personalisation } from "@shared/types"
import { PersonalisationSettings } from "@/features/settings/personalisation-settings/personalisation-settings"
import { slot } from "@/storybook/slots"

const draft: Personalisation = {
  ...EMPTY_PERSONALISATION,
  tone: "direct",
  brevity: "terse",
  branchNaming: "prefix",
  branchPrefix: "feat",
  gitWorkflow: "branch",
  commitStyle: "conventional",
  emoji: false,
  checkBeforeFinish: true,
  commitStrategy: "at-end",
}

const meta = {
  title: "Features/Settings/PersonalisationSettings",
  component: PersonalisationSettings,
  args: { draft, onPatch: fn(), onPickFiles: fn(), onRemoveFile: fn(), SaveBar: slot("SaveBar") },
} satisfies Meta<typeof PersonalisationSettings>

export default meta
type Story = StoryObj<typeof meta>

export const Filled: Story = {}

export const Empty: Story = { args: { draft: { ...EMPTY_PERSONALISATION } } }

export const PinnedFiles: Story = {
  args: {
    draft: { ...draft, pinnedFiles: [{ name: "GUIDELINES.md", content: "# Renderer guidelines" }] },
  },
}
