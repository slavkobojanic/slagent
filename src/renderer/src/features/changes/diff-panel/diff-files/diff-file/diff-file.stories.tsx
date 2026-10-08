import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { DiffFile } from "@/features/changes/diff-panel/diff-files/diff-file/diff-file"
import { diffComment } from "@/storybook/sample"
import { parseDiff } from "@/lib/diff"

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

const file = parseDiff(SAMPLE_DIFF)[0]

const meta = {
  title: "Features/Changes/DiffFile",
  component: DiffFile,
  args: {
    file,
    comments: [],
    draft: null,
    themeType: "dark",
    onStartDraft: fn(),
    onDraftSave: fn(),
    onDraftCancel: fn(),
    onRemoveComment: fn(),
    onViewFile: fn(),
  },
} satisfies Meta<typeof DiffFile>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithComment: Story = { args: { comments: [diffComment()] } }

export const WithDraft: Story = { args: { draft: { path: "src/app.ts", side: "new", line: 3 } } }
