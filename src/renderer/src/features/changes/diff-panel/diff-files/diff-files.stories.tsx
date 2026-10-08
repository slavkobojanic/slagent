import type { Meta, StoryObj } from "@storybook/react-vite"
import { DiffFiles } from "@/features/changes/diff-panel/diff-files/diff-files"
import { parseDiff } from "@/lib/diff"
import { slot } from "@/storybook/slots"

const SAMPLE_DIFF = [
  "diff --git a/src/app.ts b/src/app.ts",
  "index 1111111..2222222 100644",
  "--- a/src/app.ts",
  "+++ b/src/app.ts",
  "@@ -1,3 +1,3 @@",
  " const a = 1",
  "-const b = 2",
  "+const b = 3",
  " export {}",
  "",
].join("\n")

const meta = {
  title: "Features/Changes/DiffFiles",
  component: DiffFiles,
  args: { files: parseDiff(SAMPLE_DIFF), emptyText: "No changes in this scope", DiffFile: slot("DiffFile") },
} satisfies Meta<typeof DiffFiles>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = { args: { files: [] } }
