import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { ChooseFolder } from "@/features/library/sidebar/open-project/choose-folder/choose-folder"

const meta = {
  title: "Features/Library/ChooseFolder",
  component: ChooseFolder,
  args: { onChooseFolder: fn() },
} satisfies Meta<typeof ChooseFolder>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
