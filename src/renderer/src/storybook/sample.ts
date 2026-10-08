import type {
  AnsweredQuestion,
  AppMeta,
  AssistantMessage,
  ChatSearchResult,
  ChatSummary,
  CliStatus,
  DiffComment,
  FileMatch,
  GitFile,
  GitStatus,
  McpServerStatus,
  ModelOption,
  OpenRouterStatus,
  ProjectSummary,
  Question,
  QueuedMessage,
  ReplyComment,
  SlashCommand,
  TaskInfo,
  TodoItem,
  ToolMessage,
  UsageState,
  UserAttachment,
  UserMessage,
} from "@shared/types"
import { EMPTY_PERSONALISATION } from "@shared/types"

export function model(overrides: Partial<ModelOption> = {}): ModelOption {
  return { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", contextWindow: 200_000, reasoning: true, provider: "openrouter", ...overrides }
}

export function project(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return { id: "p1", path: "/work/slagent", name: "slagent", pinned: false, pinnedAt: 0, lastOpenedAt: 1_700_000_000_000, running: false, attention: false, ...overrides }
}

export function chat(overrides: Partial<ChatSummary> = {}): ChatSummary {
  return { id: "c1", title: "Set up storybook stories", pinned: false, pinnedAt: 0, updatedAt: 1_700_000_000_000, running: false, status: "idle", finishedAt: null, ...overrides }
}

export function searchResult(overrides: Partial<ChatSearchResult> = {}): ChatSearchResult {
  return { projectId: "p1", projectName: "slagent", chatId: "c1", title: "Set up storybook stories", snippet: "…and stories for each component…", messageId: "m1", updatedAt: 1_700_000_000_000, ...overrides }
}

export function openRouter(overrides: Partial<OpenRouterStatus> = {}): OpenRouterStatus {
  return { configured: false, source: null, type: null, envKey: false, ...overrides }
}

export function cli(overrides: Partial<CliStatus> = {}): CliStatus {
  return { path: "/usr/local/bin/slagent", state: "installed", ...overrides }
}

export function meta(overrides: Partial<AppMeta> = {}): AppMeta {
  return {
    ready: true,
    error: null,
    cwd: "/work/slagent",
    agentDir: "/Users/me/.slagent",
    modelId: "anthropic/claude-sonnet-4",
    modelName: "Claude Sonnet 4",
    modelProvider: "openrouter",
    models: [model()],
    routing: "balance",
    effort: "medium",
    titleModelId: "deepseek/deepseek-v4-flash-0731",
    titleModels: [
      { id: "deepseek/deepseek-v4-flash-0731", name: "DeepSeek V4 Flash (0731)" },
      { id: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite" },
    ],
    openRouter: openRouter({ configured: true, source: "keychain", type: "api_key" }),
    extensions: [],
    extensionErrors: [],
    usageTotals: { tokens: 15_500, cost: 0.42, chats: 3 },
    personalisation: EMPTY_PERSONALISATION,
    ...overrides,
  }
}

export function mcpServer(overrides: Partial<McpServerStatus> = {}): McpServerStatus {
  return { name: "filesystem", state: "connected", enabled: true, oauth: false, tools: 12, description: "Read and write files", detail: null, ...overrides }
}

export function task(overrides: Partial<TaskInfo> = {}): TaskInfo {
  return { id: "t1", label: "Run tests", command: "pnpm test", status: "running", exitCode: null, startedAt: 1_700_000_000_000, endedAt: null, ...overrides }
}

export function todo(overrides: Partial<TodoItem> = {}): TodoItem {
  return { text: "Write stories for each component", status: "in_progress", ...overrides }
}

export function queued(overrides: Partial<QueuedMessage> = {}): QueuedMessage {
  return { id: "q1", text: "Also cover the empty states", mode: "follow-up", detail: "follow-up", ...overrides }
}

export function attachment(overrides: Partial<UserAttachment> = {}): UserAttachment {
  return { id: "a1", name: "screenshot.png", kind: "image", ...overrides }
}

export function diffComment(overrides: Partial<DiffComment> = {}): DiffComment {
  return { id: "d1", path: "src/renderer/src/components/ui/button.tsx", line: 12, side: "new", code: "size: {", text: "Add an xs size", ...overrides }
}

export function replyComment(overrides: Partial<ReplyComment> = {}): ReplyComment {
  return { id: "r1", messageId: "m1", block: "## Heading", quote: "Heading", text: "Rename this", ...overrides }
}

export function fileMatch(overrides: Partial<FileMatch> = {}): FileMatch {
  return { path: "src/renderer/src/components/ui/button.tsx", name: "button.tsx", ...overrides }
}

export function slashCommand(overrides: Partial<SlashCommand> = {}): SlashCommand {
  return { name: "review", insert: "/review", description: "Review the pending changes", kind: "command", ...overrides }
}

export function usage(overrides: Partial<UsageState> = {}): UsageState {
  return { contextTokens: 42_000, contextWindow: 200_000, percent: 21, inputTokens: 12_400, outputTokens: 3_100, cacheTokens: 0, totalTokens: 15_500, cost: 0.42, ...overrides }
}

export function gitFile(overrides: Partial<GitFile> = {}): GitFile {
  return { path: "src/renderer/src/components/ui/button.tsx", status: "modified", staged: false, ...overrides }
}

export function gitStatus(overrides: Partial<GitStatus> = {}): GitStatus {
  return { repo: true, branch: "feat-storybook-stories", upstream: "origin/feat-storybook-stories", ahead: 1, behind: 0, files: [gitFile()], ...overrides }
}

export function userMessage(overrides: Partial<UserMessage> = {}): UserMessage {
  return { id: "u1", role: "user", text: "Add storybook stories for every component.", attachments: [], entryId: "e1", ...overrides }
}

export function assistantMessage(overrides: Partial<AssistantMessage> = {}): AssistantMessage {
  return { id: "m1", role: "assistant", text: "Done. Every view now has a story.", thinking: "", streaming: false, error: null, ...overrides }
}

export function toolMessage(overrides: Partial<ToolMessage> = {}): ToolMessage {
  return { id: "t1", role: "tool", name: "read", label: "Read file", args: '{"path":"src/shared/types.ts"}', output: "", images: [], running: false, isError: false, ...overrides }
}

export function question(overrides: Partial<Question> = {}): Question {
  return {
    id: "q1",
    question: "Which library should the stories use?",
    header: "Storybook",
    multiSelect: false,
    options: [
      { label: "Storybook", description: "One story per named state", recommended: true },
      { label: "Ladle", description: "A lighter Vite alternative" },
      { label: "Nothing", description: "Keep the test files only" },
    ],
    ...overrides,
  }
}

export function answeredQuestion(overrides: Partial<AnsweredQuestion> = {}): AnsweredQuestion {
  return { question: "Which library should the stories use?", header: "Storybook", selected: ["Storybook"], skipped: false, ...overrides }
}
