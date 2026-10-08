import { EMPTY_PERSONALISATION, type AppMeta, type DiffComment, type FileView, type GitStatus } from "@shared/types"
import type { RunTranscript } from "@/mirror/run-store/run-store"

export const SAMPLE_DIFF = [
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

export function makeMeta(cwd: string): AppMeta {
  return {
    ready: true,
    error: null,
    cwd,
    agentDir: "/agent",
    modelId: null,
    modelName: null,
    modelProvider: null,
    models: [],
    routing: "balance",
    effort: "medium",
    titleModelId: null,
    titleModels: [],
    openRouter: { configured: true, source: null, type: "api_key", envKey: false },
    extensions: [],
    extensionErrors: [],
    usageTotals: { tokens: 0, cost: 0, chats: 0 },
    personalisation: { ...EMPTY_PERSONALISATION },
  }
}

export function makeTranscript(overrides: Partial<RunTranscript> = {}): RunTranscript {
  return {
    chatId: "chat-1",
    messages: [],
    windowStart: 0,
    hasOlder: false,
    hasNewer: false,
    streaming: false,
    notice: null,
    queue: [],
    usage: null,
    todos: [],
    planMode: false,
    tasks: [],
    planProposal: null,
    question: null,
    ...overrides,
  }
}

export function makeStatus(overrides: Partial<GitStatus> = {}): GitStatus {
  return {
    repo: true,
    branch: "main",
    upstream: "origin/main",
    ahead: 0,
    behind: 0,
    files: [{ path: "src/app.ts", status: "modified", staged: false }],
    ...overrides,
  }
}

export function makeFile(overrides: Partial<FileView> = {}): FileView {
  return {
    path: "src/app.ts",
    absolutePath: "/work/src/app.ts",
    line: null,
    contents: "export {}",
    size: 9,
    binary: false,
    truncated: false,
    ...overrides,
  }
}

export function makeComment(overrides: Partial<DiffComment> = {}): DiffComment {
  return {
    id: "c1",
    path: "src/app.ts",
    line: 2,
    side: "new",
    code: "const b = 3",
    text: "Why this value?",
    ...overrides,
  }
}
