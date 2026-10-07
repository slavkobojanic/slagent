# SPC migration plan (renderer)

Migrates `src/renderer/src/` to the store / presenter / component pattern in [`GUIDELINES.md`](../GUIDELINES.md). The guidelines are the rules; this file is the work breakdown and the frozen contracts that let agents work in parallel without touching each other's files.

## Definition of done

1. `pnpm typecheck` passes with zero errors.
2. `pnpm test` passes. Every store, presenter, and view has a test file.
3. `pnpm check:spc` passes with zero violations.
4. `pnpm build` (electron-vite) succeeds.
5. Every legacy file in `components/`, `components/ai-elements/` (non-ui), `lib/`, and `App.tsx` is either deleted or listed as intentionally kept (vendored).
6. Behaviour parity: each item in [Parity checklist](#parity-checklist) still works.

## Phases

| Phase | Who | Output | Gate |
| --- | --- | --- | --- |
| 0 | Lead | Branch `spc-migration`, this plan, GUIDELINES.md | Files exist |
| 1A | Foundation A | Tooling, `ipc/`, checker, test harness, dead code removed | `pnpm typecheck` clean (no new errors) |
| 1B | Foundation B | `mirror/`, `state/`, root `create.tsx`, slice stubs, `index.css` split, `App.tsx` removed | `pnpm typecheck` errors only in legacy files owned by slices |
| 2 | Slices S1–S10, in parallel | Each slice's feature folder, stores, presenters, views, tests; legacy files deleted | Each slice's own checks pass |
| 3 | Lead | Integration: fix cross-slice seams, remove leftovers, full verification | Definition of done |

Phases 1A and 1B run one after the other. Phase 2 starts only when 1B's gate passes.

## Frozen contracts

Frozen means: slices may **use** these, may not **change** their shape. A needed change is reported to the lead, not made.

### IPC services (`ipc/`, Foundation A)

`ipc/services.ts`:

```ts
export type Services = {
  app: AppService;                 // platform, systemVersion, getSnapshot, onEvent, openExternal
  chat: ChatService;               // prompt, abort, newChat, editMessage, rewind, undoRewind, compact,
                                   // setQueueMode, removeQueued, setPlanMode, approvePlan, answerQuestion,
                                   // pageTranscript, readTranscript
  library: LibraryService;         // openProject, openChat, searchChats, pinProject, pinChat, renameChat,
                                   // deleteChat, removeProject, chooseFolder
  files: FileService;              // searchFiles, readFile, openInEditor, pathForFile
  commands: CommandService;        // listCommands
  tasks: TaskService;              // taskOutput, stopTask
  git: GitService;                 // gitStatus, gitDiff, gitCommit, gitPush, gitPullRequest, gitCommitMessage
  settings: SettingsService;       // saveOpenRouterKey, logoutOpenRouter, setModel, setPersonalisation
  cli: CliService;                 // cliStatus, installCli, uninstallCli
  mcp: McpService;                 // mcpList, mcpSignIn, mcpSignOut, mcpSetEnabled
  permissions: PermissionService;  // getPermissions, requestAccessibility, requestScreenRecording, openPermissionSettings
  updates: UpdateService;          // updateStatus, installUpdate, onUpdateReady
};

export function installServices(): Services;
```

Method names and parameter and return types are exactly those of `SlagentApi` in `src/shared/types.ts`. Each domain has `ipc/<domain>-service/<domain>-service.ts` (interface `XService` and class `IpcXService`), `fake-<domain>-service.ts` (class `FakeXService`), and `install.ts` (`installXService()`).

`ipc/install-context.ts` exports `getInstallContext(): { mode: "fake" } | { mode: "real"; api: SlagentApi }`. It resolves the mode on each call and caches nothing.

### Mirror (`mirror/`, Foundation B)

```ts
export type Mirror = {
  library: LibraryStore;   // library: LibraryState; getters openProjectId, openChatId
  meta: MetaStore;         // meta: AppMeta | null; getters ready, configured
  run: RunStore;           // every TranscriptState field plus chatId; setTranscript(event)
  start(): void;           // subscribe to onEvent once, then load the snapshot
  stop(): void;
};
export function createMirror(services: Services): Mirror;
```

Only `MirrorPresenter` writes these stores. The gates are ported from `App.tsx:143-211`. The transcript revision advances before the chat gate.

### Shared state (`state/`, Foundation B)

`state/app-deps.ts`:

```ts
export type AppDeps = {
  services: Services;
  env: { window: Window };
  mirror: Pick<Mirror, "library" | "meta" | "run">;
  shared: {
    layout: LayoutStore;           layoutPresenter: LayoutPresenter;
    overlay: OverlayStore;
    panel: PanelStore;             panelPresenter: PanelPresenter;
    theme: ThemeStore;             themePresenter: ThemePresenter;
    commands: CommandRegistry;
    keyboard: KeyboardPresenter;   links: LinkPresenter;
    composer: ComposerPort;
    review: ReviewStore;           reviewPresenter: ReviewPresenter;
    permissions: PermissionsStore;
    mcp: McpStore;
  };
};
export function createSharedState(services: Services, window: Window): AppDeps["shared"];
```

Behaviour of each shared piece, by its owner:

- `LayoutStore`: `sidebarOpen`, `sidebarWidth`, `diffWidth`; `setSidebarOpen(open)`, `setWidth(edge: "sidebar" | "diff", px)`. `LayoutPresenter`: `toggleSidebar()`, `handleResizeStart(edge, event)`, `endDrag()`, `stop()`. Persists to `slagent:sidebar-width` and `slagent:changes-width`. Ports `lib/resize.ts`.
- `OverlayStore`: `settingsOpen`, `modelOpen`, `paletteOpen`; `setOpen(kind: "settings" | "model" | "palette", open)`.
- `PanelStore`: `open`, `tab: RightTab`, `viewedFile: FileView | null`; `setOpen`, `setTab`, `setViewedFile`. `PanelPresenter`: `openFile(path, line?)` (reads through `services.files.readFile`, sets `viewedFile`, sets tab `"file"`, opens the panel), `selectTab(tab)`, `setOpen(open)`. Ports `VIEW_FILE_EVENT` (`App.tsx:333-338`).
- `ThemeStore`: `preference`, `systemDark`; getter `resolved`; `setPreference`. `ThemePresenter`: `setPreference(p)` (persists to `slagent-theme`), `start()` (`matchMedia` listener, `dark` class on `<html>`), `stop()`. Ports `lib/theme.ts` with no import-time side effects.
- `CommandRegistry`: `register(command): () => void` (returns disposer), `commands` (getter, registration order), `run(id)`. `Command = { id; label; group: "Actions" | "Chats" | "Projects" | "Commands"; shortcut?: { key: string; mod?: boolean; shift?: boolean; alt?: boolean }; enabled?: () => boolean; run: () => void }`. `mod` means Meta or Ctrl on every platform, as the old keydown handler allowed.
- `KeyboardPresenter`: `start()` attaches `keydown` to `env.window` and dispatches to enabled commands with a matching shortcut. `stop()` removes it. Feature code registers commands, never listeners.
- `LinkPresenter`: `start()` / `stop()`. Ports the document click handler (`App.tsx:310-331`): file paths open the panel, external links go through `services.app.openExternal`.
- `ComposerPort`: `attach(handle: { focus(): void; fill(text: string): void }): () => void`, `focus()`, `fill(text)`. No-op while nothing is attached.
- `ReviewStore`: `diffComments`, `replyComments`; setters only. `ReviewPresenter`: an empty class in 1B. Slice S5 fills it in.
- `PermissionsStore`: `permissions: ComputerPermissions | null`; getter `locked` (the condition that currently sets `inert` on the root, `App.tsx` permissions block); `setPermissions`.
- `McpStore`: `servers: McpServerStatus[]`; `setServers`.

### Slice create signatures (`features/<slice>/create.tsx`, stubs from Foundation B)

Slot types live in `state/slots.ts` (Foundation B), so no slice imports another slice's `create.tsx`. Each slice's `create.tsx` exports the owning create below. The root create calls them in this order. The signatures are frozen.

```ts
// order matters: each line may use the results of the lines above it
const review  = createReview(deps);                                       // ReviewSlots
const agent   = createAgent(deps);                                        // AgentSlots
const runStatus = createRunStatus(deps);                                  // RunStatusSlots
const composer  = createComposer({ ...deps, review, runStatus });         // ComposerSlots
const transcript = createTranscript({ ...deps, review, question: agent.Question }); // TranscriptSlots
const changes    = createChanges({ ...deps, review });                    // ChangesSlots
const library    = createLibrary(deps);                                   // LibrarySlots
const settings   = createSettings(deps);                                  // SettingsSlots
const models     = createModels(deps);                                   // ModelsSlots
const Shell      = createShell({ ...deps, slots: { ...library, ...settings, ...models, ...transcript, ...composer, ...changes } });
```

| Create | Returns |
| --- | --- |
| `createReview(deps: AppDeps): ReviewSlots` | `{ CommentableResponse: ComponentType<{ messageId: string; children: ReactNode }> }` |
| `createAgent(deps: AppDeps): AgentSlots` | `{ Question: ComponentType<{ question: QuestionRequest }> }` |
| `createRunStatus(deps: AppDeps): RunStatusSlots` | `{ RunStatusBar: ComponentType }` |
| `createComposer(deps: AppDeps & { review: ReviewSlots; runStatus: RunStatusSlots }): ComposerSlots` | `{ Composer: ComponentType }` |
| `createTranscript(deps: AppDeps & { review: ReviewSlots; question: AgentSlots["Question"] }): TranscriptSlots` | `{ Transcript: ComponentType }` |
| `createChanges(deps: AppDeps & { review: ReviewSlots }): ChangesSlots` | `{ RightPanel: ComponentType }` |
| `createLibrary(deps: AppDeps): LibrarySlots` | `{ Sidebar; LibraryDialogs; CommandPalette: ComponentType }` |
| `createSettings(deps: AppDeps): SettingsSlots` | `{ SettingsDialog: ComponentType }` |
| `createModels(deps: AppDeps): ModelsSlots` | `{ ModelDialog; PermissionsWizard: ComponentType }` |
| `createShell(deps: AppDeps & { slots: ShellSlots }): ComponentType` | the root view |

`ShellSlots` is the union of all the slot objects above, except `ReviewSlots`, `AgentSlots`, and `RunStatusSlots`.

Feature creates never import another feature's `create.tsx`. The root create is the only place that wires slices together.

## File ownership

Every file has one owner. Owners may edit their files. Anyone else who needs a change reports it.

**Foundation A** owns: `src/renderer/src/ipc/**`, `src/renderer/src/test/**`, `vitest.config.ts`, `scripts/check-spc.mjs`, `package.json`, `pnpm-lock.yaml`, `tsconfig.web.json`, `components/markdown.tsx` (delete), `components/ai-elements/terminal.tsx` (delete).

**Foundation B** owns: `src/renderer/src/create.tsx`, `main.tsx`, `App.tsx` (delete), `index.css` (split), `mirror/**`, `state/**`, `lib/resize.ts` (delete), `lib/theme.ts` (delete), every `features/*/create.tsx` stub, and every `features/*/<slice>.css` created by the split.

**Slices** (legacy files they delete, and the feature folder they create):

| Slice | Legacy files owned | Feature folder | Also owns |
| --- | --- | --- | --- |
| S1 shell | `lib/format.ts` (keep formatters, remove IPC functions) | `features/shell/` | `state/layout-*`, `state/theme-*`, `state/keyboard-presenter.ts`, `state/link-presenter.ts`, `state/command-registry.ts`; creates `components/resize-handle.tsx` |
| S2 library | `components/sidebar.tsx`, `components/library-dialogs.tsx`, `components/command-palette.tsx` | `features/library/` | — |
| S3 transcript | `components/transcript.tsx`, `components/fading-response.tsx`, `components/ai-elements/conversation.tsx`, `components/ai-elements/message.tsx`, `components/ai-elements/shimmer.tsx` | `features/transcript/` | — |
| S4 agent | `components/question-card.tsx`, `components/question-media.tsx`, `components/ai-elements/chain-of-thought.tsx`, `components/ai-elements/reasoning.tsx` | `features/agent/` | — |
| S5 review | `components/response-comments.tsx` | `features/review/` | `state/review-store.ts`, `state/review-presenter.ts`, `components/comment-draft.tsx` (keep, dumb) |
| S6 changes | `components/right-panel.tsx`, `components/diff-panel.tsx`, `components/file-viewer.tsx`, `lib/diff.ts`, `lib/pierre.ts` | `features/changes/` | — |
| S7 composer | `components/composer.tsx`, `components/ai-elements/prompt-input.tsx`, `lib/composer.ts`, `lib/drafts.ts`, `lib/history.ts` | `features/composer/` | — |
| S8 run-status | `components/task-strip.tsx`, `components/todo-panel.tsx`, `components/usage-meter.tsx`, `components/ai-elements/queue.tsx` | `features/run-status/` | — |
| S9 settings | `components/settings-dialog.tsx` | `features/settings/` | — |
| S10 models | `components/model-dialog.tsx`, `components/permissions-wizard.tsx`, `components/provider-logo.tsx` (keep, dumb, shared) | `features/models/` | `state/permissions-store.ts` (presenter logic only) |

Vendored and untouched: `components/ui/**`, `lib/utils.ts`, `lib/genie.ts`, `shared/types.ts`, and the rest of `components/ai-elements/**` except the files above. Owners may remove unused exports from vendored files they own.

Feature folders are created by their slice. Files outside a slice's list are frozen to it.

## Slice specs

Each slice reads its legacy files in full before writing anything. Line references are to the **legacy** `App.tsx` and components.

### S1 — shell

- Legacy: `App.tsx` (already removed by 1B; port the header and layout parts from its history if needed), `lib/format.ts`.
- Build: `features/shell/`: `create.tsx` (`createShell`, owning, `observer` for the layout and permissions stores), `shell.tsx` (grid, header, update banner, sidebar toggle, `inert` root while `permissions.locked`), `update-store`, `update-presenter` (`updateStatus`, `installUpdate`, `onUpdateReady`; `App.tsx:143-149`).
- Header: project and chat title, `ProviderLogo`, configured badge, MCP badge from `McpStore`.
- Keyboard: register `Cmd+B` (sidebar toggle).
- Replace `openPath` and `openInEditor` in `lib/format.ts` with `services.files` calls at each caller. Other slices get `openInEditor` from `deps.services.files`.
- Keep `link-presenter.ts` listening for `VIEW_FILE_EVENT` until S3 and S6 stop dispatching it. Remove the listener in integration.

### S2 — library

- Legacy: `components/sidebar.tsx`, `components/library-dialogs.tsx`, `components/command-palette.tsx`.
- Build: `features/library/`: sidebar (projects, chats, status, pin, rename, search results), delete-chat and remove-project confirmations (store per dialog, example 2 in GUIDELINES), palette (lists `deps.shared.commands`; no hard-coded action list), navigation history (`App.tsx:103-123`, `Cmd+[` and `Cmd+]`), search (`Cmd+Shift+F`), new chat (`Cmd+N`), open chat `Cmd+1` to `Cmd+9`, palette (`Cmd+K`).
- Reset on chat switch (`App.tsx:128-141`): when the open chat changes, call `panelPresenter.selectTab`/`setOpen(false)`, `setViewedFile(null)`, and `reviewPresenter.reset()`. The exception is a draft becoming a chat. Use a `reaction` on `mirror.library.openChatId`, keep its disposer, and call it in `stop()`.
- Move `modKey` and `orderedChats` out of `sidebar.tsx` into `features/library/library-utils.ts`.
- Behaviour: `App.tsx:484-518` (palette actions) is replaced by commands registered by each slice.

### S3 — transcript

- Legacy: `components/transcript.tsx`, `components/fading-response.tsx`, `components/ai-elements/conversation.tsx`, `components/ai-elements/message.tsx`, `components/ai-elements/shimmer.tsx`.
- Build: `features/transcript/`: transcript view (rows as elements from assemble creates), paging (`pageTranscript`), jump to message (`jumpTo`, `App.tsx:69`), rewind and undo (`rewind`, `undoRewind`), edit last message (`Cmd+Shift+E`, a command; replaces `EDIT_LAST_EVENT`), plan card (`planProposal`), notices, reveal of streamed blocks (`FadingResponse`).
- Scroll: `transcript.tsx` currently calls `useStickToBottomContext` (lines 711 and 801). Move that behaviour into vendored primitives in `components/ai-elements/conversation.tsx`, as components that take props. The transcript view must not call a hook.
- Rewind fills the composer through `deps.shared.composer.fill`.
- `CommentableResponse` comes from `deps.review`. `Question` comes from `deps.question`.

### S4 — agent

- Legacy: `components/question-card.tsx`, `components/question-media.tsx`, `components/ai-elements/chain-of-thought.tsx`, `components/ai-elements/reasoning.tsx`.
- Build: `features/agent/`: `create.tsx` returns `{ Question }`, an owning host for the question card. Its store holds paging, selections, and the custom reply. Its presenter sends `services.chat.answerQuestion`. The host reads `mirror.run.question` (prop).
- `question-media.tsx` keeps its sandboxed frame and lightbox. It gets the theme from `deps.shared.theme` in the owning host and passes it down as a prop.
- `reasoning.tsx` and `chain-of-thought.tsx` stay vendored primitives with props. Remove `useReasoning` and `useChainOfThought` from feature use. The transcript renders the primitives directly.

### S5 — review

- Legacy: `components/response-comments.tsx`.
- Build: `features/review/create.tsx` returns `{ CommentableResponse }`. `components/review/commentable-response.tsx` is the dumb view. The CSS highlight name `reply-comment` stays the same. Module-level `commentRanges` (`response-comments.tsx:96`) becomes instance state on the presenter.
- Implement `state/review-presenter.ts`: `addDiffComment`, `removeDiffComment`, `addReplyComment`, `removeReplyComment`, `reset()`, plus `takeForSubmit()` returning both lists and clearing them, and `restore(snapshot)`. S7's submit flow uses `takeForSubmit` and `restore` (`App.tsx:683-707`).
- `components/comment-draft.tsx` is kept as a dumb component. Its props do not change. Changes uses it.

### S6 — changes

- Legacy: `components/right-panel.tsx`, `components/diff-panel.tsx`, `components/file-viewer.tsx`, `lib/diff.ts`, `lib/pierre.ts`.
- Build: `features/changes/`: right panel (tabs `changes` / `file` / `plan`; resize handle from `components/resize-handle.tsx`, width from `deps.shared.layout`), diff panel (git status, diffs, comments, commit, push, PR; `services.git`), file viewer (Pierre, theme from `deps.shared.theme`), plan tab (`mirror.run.planProposal`).
- `Cmd+Shift+D` toggles the panel: register a command.
- Refresh the diff when a run ends. Use a `reaction` on `mirror.run.streaming` going false, keep its disposer, and call it in `stop()` (`App.tsx` streaming effect).
- `lib/pierre.ts` keeps its preload function. `main.tsx` (1B) imports `preloadPierreHighlighter` from `@/lib/pierre`, so this export must survive the slice.

### S7 — composer

- Legacy: `components/composer.tsx`, `components/ai-elements/prompt-input.tsx`, `lib/composer.ts`, `lib/drafts.ts`, `lib/history.ts`.
- Build: `features/composer/`: prompt box with `@file` and `@chat` mentions (`services.files.searchFiles`, `services.library.searchChats`), slash commands (`services.commands.listCommands`), attachments (images and PDFs, `services.files.pathForFile` for drops), prompt history (`slagent:prompt-history`), per-chat drafts (`slagent:composer-drafts`), queue mode and plan mode toggles, compact.
- Submit: `onPrompt` (`App.tsx:683-707`). Take review comments with `reviewPresenter.takeForSubmit()`. On failure, restore them only if the same chat is still open, otherwise refill the composer or save a draft.
- Attach to `deps.shared.composer` with `attach` and remove `lib/composer.ts` (the `main form textarea` selector goes away).
- Esc aborts the run while streaming, unless `[role=dialog]` or `[role=menu]` is open (`App.tsx:216`, `composer.tsx:252`). Register this as a command.
- `Cmd+L` focuses the composer. Register a command.
- Remove the unused `PromptInputProvider` and its hooks and contexts from `prompt-input.tsx`.
- `deps.runStatus.RunStatusBar` renders above the input.

### S8 — run-status

- Legacy: `components/task-strip.tsx`, `components/todo-panel.tsx`, `components/usage-meter.tsx`, `components/ai-elements/queue.tsx`.
- Build: `features/run-status/`: `create.tsx` returns `{ RunStatusBar }`, an owning host that reads `mirror.run` (usage, todos, tasks, queue). Tasks: `taskOutput` in a dialog, `stopTask`. Queue: `setQueueMode`, `removeQueued`. Usage meter: `compact`.

### S9 — settings

- Legacy: `components/settings-dialog.tsx`.
- Build: `features/settings/`: dialog shell (`overlay.settingsOpen`, `Cmd+,` registered as a command), OpenRouter key (example 1 in GUIDELINES), theme picker (`deps.shared.themePresenter.setPreference`), personalisation (`setPersonalisation`), MCP (`services.mcp`, writes `deps.shared.mcp`; `mcpList` on open and when `meta.ready`, `App.tsx:357-364`), CLI (`services.cli`), and the `genieTo` animation from `lib/genie.ts`.
- Each section is a sub-unit with its own store and presenter where it has state.

### S10 — models

- Legacy: `components/model-dialog.tsx`, `components/permissions-wizard.tsx`. Keep `components/provider-logo.tsx` (dumb, shared).
- Build: `features/models/`: `create.tsx` returns `{ ModelDialog, PermissionsWizard }`. Model dialog: grouping by provider (`PROVIDERS`, `OPENROUTER_LIMIT`), search, `services.settings.setModel` (`ModelChange.applied`), `overlay.modelOpen`.
- Permissions: a presenter writes `deps.shared.permissions` from `services.permissions.getPermissions()`. It polls every second on macOS while permissions are missing, and stops when both are granted (`App.tsx:368-395`). Wizard: `requestAccessibility`, `requestScreenRecording`, `openPermissionSettings`.

## Rules for every slice agent

1. Edit only your files (see [File ownership](#file-ownership)). Anything else is frozen. If you need a change there, do not make it. Put it in your final report under **Requests for owners**, and work around it in your slice if you can.
2. Do not touch `window.slagent`. Call `deps.services.*`. Do not import `ipc/` implementation classes; use the interfaces. Presenters take `Pick<XService, ...>` of the methods they use, not the whole service. `createMockInstance` types `platform` and `systemVersion` as mocks, so a full `AppService` would not type-check against a mock.
3. No React hooks in feature code, except one `useEffect` in an owning host to bind `start`/`stop`. Use a store, presenter, callback ref, or props instead (see GUIDELINES "Hooks").
4. Imports: `@/` alias, never `../`. Kebab-case files and folders. PascalCase exports. No `index.ts` barrels. Formatting matches the existing code: no semicolons, double quotes, two-space indent.
5. Port behaviour faithfully. Read the legacy file in full first. Keep user-visible text, keyboard behaviour, localStorage keys, and CSS highlight names. Translate CSS modules to Tailwind classes and keep the visual result close.
6. Delete your legacy files once your replacement is complete. Grep first, and confirm nothing outside your slice imports them.
7. Tests: stores use a real instance, presenters use `createMockInstance`, views use props-in and markup-out with one test per named state. Colocate `*.test.ts(x)`.
8. Do not run `pnpm build` or `pnpm dev`. Do not commit.
9. Verify before you finish:
   - `pnpm exec tsc --noEmit -p tsconfig.web.json 2>&1 | grep -E "src/renderer/src/(features/<slice>|<your files>)"` shows no errors in your files.
   - `pnpm exec vitest run <your feature folder>` passes.
   - `node scripts/check-spc.mjs <your feature folder>` passes.
10. Final report, at most 400 words: files created and deleted, behaviour ported, any intentional deviation, test and check results, and **Requests for owners**.

## Verification

| Check | Command | When |
| --- | --- | --- |
| Typecheck | `pnpm typecheck` | Each phase gate |
| Tests | `pnpm test` | Each phase gate |
| Rule checker | `pnpm check:spc` | Each phase gate, final |
| Bundle | `pnpm build` | Integration only |

## Parity checklist

Integration checks these by reading code and by a manual smoke run.

- Keyboard: `Cmd+K` palette, `Cmd+,` settings, `Cmd+N` new chat, `Cmd+Shift+F` search, `Cmd+Shift+D` changes, `Cmd+Shift+E` edit last, `Cmd+B` sidebar, `Cmd+L` composer, `Cmd+[` and `Cmd+]` history, `Cmd+1` to `Cmd+9` open chat, `Esc` abort (not when a dialog or menu is open).
- Selectors and keys that must not change: `[role=dialog],[role=menu]`, CSS highlight `reply-comment`, `localStorage` keys `slagent-theme`, `slagent:composer-drafts`, `slagent:prompt-history`, `slagent:sidebar-width`, `slagent:changes-width`.
- Mirror ordering: transcript revision advances before the chat gate. Stale snapshot responses are dropped.
- Permissions: the root is `inert` while permissions are missing on macOS, the wizard shows, and the poll stops once both are granted.
- Comments: a failed submit restores review comments only if the same chat is still open.
- Theme: system, light, and dark. `dark` class on `<html>`. Toaster follows the theme.
