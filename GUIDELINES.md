# Renderer guidelines

Store / presenter / component (SPC) rules for `src/renderer/src/`. Ported from the twitt web frontend (`web/GUIDELINES.md`) and adapted for an Electron app: state lives in the main process, transport is IPC, and styling is Tailwind plus shadcn.

Out of scope: `components/ui/**` (shadcn, CLI-managed) and `components/ai-elements/**` (vendored). Feature code consumes them and does not restyle them. Main process (`src/main`), preload and `src/shared/types.ts` are the IPC contract, not renderer code.

This file is the source of truth. Do not invent a different state, folder, styling, or data-flow pattern.

## Electron differences (read first)

- **The main process owns app state.** The library, transcripts, runs, usage, todos, tasks, and the open project or chat are authoritative in `src/main`. The renderer mirrors them through `UiEvent`s and the snapshot. Only `mirror/` writes mirrored fields.
- **Server state is not optimistic.** A command calls a service and returns. The new state arrives as an event, and the mirror applies it. If the call throws, the presenter sets an `error` on its own store and leaves mirrored state alone.
- **UI state is renderer-owned.** Sidebar and panel widths, dialog open flags, drafts, comment drafts, theme, and keyboard commands live in renderer stores.
- **There is no router.** No `react-router`, no `navigate`, no `assign`, no URL. The open project and chat are mirrored `library` state.
- **Transport is IPC.** `window.slagent` is read only in `ipc/`. Services are interfaces with a real (preload) and a fake (in-memory) implementation.
- **Styling is Tailwind plus shadcn.** No CSS modules. Classes live on the view. `cn()` merges them.

## Layers

| Layer | Job | Not allowed |
| --- | --- | --- |
| **Store** | Observable state, derived getters, rule getters. Mutate through its own methods when a write has invariants. | IPC, DOM, `window`, React, calling another store's methods |
| **Presenter** | Methods only: IPC calls, cross-store writes, DOM and window listeners, timers, clipboard. May assign fields on **its own** store when a setter would be a pure one-liner (`this.store.menuOpen = false`). Injected stores stay method-only. | Getters, view models, JSX, assigning fields on **injected** stores |
| **View** (`name.tsx`) | Render props. Calls the callbacks it receives. | Hooks, stores, presenters, IPC, `window`, formatting rules |
| **Owning `create.tsx`** | Called **once** at boot. Constructs store and presenter, starts the presenter, and returns a stable component. `observer` iff it reads a store. | Called during render, styling the view, business rules |
| **Assemble `create.tsx`** | Re-runnable. Returns a `ReactElement`. Composes already-built pieces. | Store, presenter, IPC, `observer` |
| **`ipc/<domain>-service/`** | Interface, real class over `window.slagent`, fake, `install.ts`. | UI, stores, presenters |
| **`mirror/`** | Applies `UiEvent`s and the snapshot to mirrored stores, with revision gates. | UI, IPC outside the service interfaces |

Dumb units (a row, a pill, a label) are `name.tsx` with classes inline. No `create.tsx`, no store.

`create` builds a UI unit. `install` wires a service. Presenters receive the one service they use, typed as `Pick<XService, ...>` of the methods they call, never a bag of services.

## Two kinds of `create.tsx`

- **Owning:** called once at boot, returns a **component**. A slice's `create.tsx` is always owning. It may construct a store and presenter, call `presenter.start()`, and wrap the view in `observer` when it reads a store. Slot-only composers that read no store are not `observer`.
- **Assemble:** no store, no presenter. May run again when data changes. Returns a **`ReactElement`**.

Never call an owning `create` during React render. Assemble `create` is usually called from an owning observer during its render.

## Composition

A wrapper is not concerned with a child's rows, fetch, or clicks. It only knows its slots.

- The **root `create.tsx`** calls each slice's owning `create` once, in the order the wiring table shows, and passes the returned **component types** into the shell view (`Sidebar={Sidebar}`). The view renders `<Sidebar />`.
- Assemble results are **elements**, not component types (`rows={createMessageRow(...)}`).
- Mapping a list of N lives in the unit that owns that list (the transcript view), not in the shell chrome.
- Feature creates receive `AppDeps` (see [`state/app-deps.ts`](src/renderer/src/state/app-deps.ts)) and any slot a parent slice provides. They never import another feature's `create`.
- Shared dumb components used by two features live in `components/`, never imported from another feature's folder.

## Directory and names

```
src/renderer/src/
  main.tsx                          # entry: mounts the root host, Toaster, TooltipProvider
  create.tsx                        # root owning create: services, mirror, shared state, slices
  index.css                         # Tailwind import, theme tokens, global base only
  ipc/                              # window.slagent facade
    install-context.ts              # resolves real vs fake once
    services.ts                     # the Services object passed to creates
    <domain>-service/               # interface, Ipc<Domain>Service, Fake<Domain>Service, install.ts
  mirror/                           # main-process state mirrored from events (single writer)
  state/                            # shared stores, presenters, and ports used by 2+ features
    app-deps.ts                     # the AppDeps type every feature create receives
  features/<slice>/                 # one folder per vertical slice
    create.tsx
    <slice>.tsx
    <slice>.css                     # only if the slice needs CSS beyond Tailwind classes
    <slice>-store/<slice>-store.ts
    <slice>-presenter/<slice>-presenter.ts
    <unit>/                         # colocated sub-units, dumb or SPC
  components/ui/                    # shadcn primitives (CLI-managed)
  components/ai-elements/           # vendored primitives
  components/                       # dumb or SPC units used by 2+ features
  lib/                              # pure helpers: no state, no hooks, no globals
```

Place a unit at its **nearest shared parent**. If two features need it, move it to `components/` or `state/`.

Folders and files are **kebab-case** (matches shadcn). Exports are **PascalCase**: `createComposer`, `Composer`, `ComposerStore`, `ComposerPresenter`, `installSettingsService`.

No `index.ts` barrels. Import from `create.tsx` or `<unit>.tsx`.

Imports: application code via the `@/` alias (`@/ipc/...`, `@/features/...`), shared types via `@shared/types`. Relative imports are only for children (`./prompt-input`). Never `../`.

Always destructure `props` and `deps` at the function boundary. Do not write `props.foo` or `deps.foo` in the body.

Formatting follows the existing code: no semicolons, double quotes, two-space indent. The examples below add semicolons only to keep their shape readable.

## IPC

- Services are one interface per domain, typed with the existing types in `src/shared/types.ts`. Method names match `SlagentApi`, so the mapping is one-to-one.
- Mode is resolved **once** in `ipc/install-context.ts`. The real service is used when `window.slagent` exists (the preload ran). The fake is used when `import.meta.env.VITE_USE_FAKE_IPC === "1"`, or when there is no bridge and `import.meta.env.DEV` is true (Vite in a browser, tests). With no bridge in production, the root renders an error view and mounts nothing.
- `install.ts` is the only place outside `install-context.ts` that branches on mode. It takes no arguments and returns the interface.
- The real class is a thin wrapper over `window.slagent`. Do not call `ipcRenderer`, `fetch`, or `window.slagent` anywhere else. Only `ipc/` reads `window.slagent`, and a `check:spc` rule enforces it.
- Fakes own their data, keep state per instance, and touch no storage. No module-level arrays. A fake exposes `emit(event)` so tests can drive `onEvent` listeners.
- Anything the presenter needs from the browser (`window`, `document`, `navigator.clipboard`, `matchMedia`) is passed in through `env` or a port. Presenters never touch globals directly. That keeps them testable.

```ts
// ipc/settings-service/settings-service.ts
import type { ModelChange, Personalisation } from "@shared/types";

export interface SettingsService {
  saveOpenRouterKey(apiKey: string): Promise<void>;
  logoutOpenRouter(): Promise<void>;
  setModel(modelId: string): Promise<ModelChange>;
  setPersonalisation(value: Personalisation): Promise<void>;
}

export class IpcSettingsService implements SettingsService {
  constructor(private readonly api: SlagentApi) {}

  saveOpenRouterKey = (apiKey: string) => this.api.saveOpenRouterKey(apiKey);
  logoutOpenRouter = () => this.api.logoutOpenRouter();
  setModel = (modelId: string) => this.api.setModel(modelId);
  setPersonalisation = (value: Personalisation) => this.api.setPersonalisation(value);
}
```

```ts
// ipc/settings-service/install.ts
import { getInstallContext } from "@/ipc/install-context";
import { FakeSettingsService } from "./fake-settings-service";
import { IpcSettingsService, type SettingsService } from "./settings-service";

export function installSettingsService(): SettingsService {
  const ctx = getInstallContext();
  if (ctx.mode === "fake") {
    return new FakeSettingsService();
  }

  return new IpcSettingsService(ctx.api);
}
```

## Mirror (main-process state)

- `mirror/mirror-presenter.ts` is the only writer of `library-store`, `meta-store`, and `run-store`. Those cover the snapshot and the three `UiEvent` types: `library`, `meta`, and `transcript`.
- `start()` subscribes to `onEvent` once, then loads the snapshot. `stop()` disposes the subscription and ignores any response still in flight.
- Every response that is applied (snapshot or event) passes the revision gate for its kind. The ordering rules are in `mirror/` and are tested directly. Feature code does not change them.
- Features read mirrored stores as injected, read-only stores. To change mirrored data, a feature calls a service and waits for the event that carries the new state.
- Request-response state that is not in an event (MCP servers, permissions, CLI status, update status) lives in its own store, written by its presenter.

## MobX, wiring, lifetime

- Store constructor calls `makeAutoObservable(this)`. Store constructors do no I/O.
- Presenter is a plain class. Methods are **arrow functions**. No `.bind` in the constructor. Do not `makeAutoObservable` a presenter.
- Prefer store methods for mutations with invariants (`setSelection` also clears the draft). Skip one-line setters: the owning presenter may assign that field on **its own** store. Never assign fields on an injected store, call its method.
- Owning `create` is the only `observer` when it reads a store. It reads the **store** for values and the **presenter** for commands, and passes them as **individual JSX props**. No `presenter.props`. No `toProps()`.
- `presenter.start()` attaches DOM listeners, IPC subscriptions, and timers. `presenter.stop()` removes them and cancels pending work. `stop` does not reset the store.
- Every `reaction`, `autorun`, or `when` returns a disposer. The presenter keeps it and calls it in `stop()`. A bare `reaction(...)` statement fails `check:spc`.
- No module-level mutable state: no top-level `let`, no module-level `Map`, `Set`, or array that changes. No side effects on import. Theme application and the preload warm-up run from `main.tsx` or a presenter `start()`.
- Views never import stores, presenters, `ipc/`, `mirror/`, or `state/`. Stores never import React or `.tsx`. Presenters never import React.

## Hooks

**Feature code calls no React hooks.** Hooks belong to owning hosts and vendored primitives only.

- **Views:** no hooks. That includes `useState`, `useRef`, `useEffect`, `useMemo`, `useCallback`, `useContext`, `useReducedMotion`, and library hooks such as `useStickToBottom`.
- **Owning `create.tsx`:** `observer`, and at most one `useEffect` that calls `presenter.start()` and `presenter.stop()` for a subscription that must follow the host's mount. Most subscriptions start from `create` at boot, so this is rare.
- **Custom hooks are migrated, not kept.**
  - A hook that holds state (`useResizableWidth`) becomes a store field plus a presenter method. Pointer listeners attach on drag start and detach on pointer up.
  - A hook that tracks a media query or OS setting (`useThemePreference`, `useResolvedTheme`, `useReducedMotion`) becomes a theme or preference store. A presenter owns the `matchMedia` listener in `start()`.
  - A hook that reads a context (`usePromptInputController`, `useReasoning`, `useChainOfThought`, `useMessageBranch`) becomes props from the owning host. Delete contexts nothing renders.
  - A ref used for DOM access becomes a **callback ref** bound to a presenter method (`ref={presenter.attachComposer}`). No `useRef`.
- **Vendored primitives** in `components/ui/**` and `components/ai-elements/**` may use hooks internally (Radix, `use-stick-to-bottom`). A feature view renders them with props. It never calls their hooks or reads their contexts.
- A third-party hook-based library is wrapped in a vendored primitive. The feature view renders the wrapper, not the hook.

## Styling and classnames (Tailwind plus shadcn)

- Styling lives on the view's JSX as Tailwind utility classes. No CSS modules, no CSS-in-JS. Global CSS is `index.css` (tokens and base). A feature may add `<slice>.css` for keyframes or rules Tailwind cannot express, imported by its view.
- Merge classes with `cn()` from `@/lib/utils`. Conditional classes go inside `cn(...)` as a boolean expression. Do not concatenate or join class strings by hand.
- Class strings are complete literals. Never build a class from a fragment (`` `bg-${tone}` ``). Use a lookup map of full class strings. Tailwind must see every class name in source.
- State styling uses attributes. shadcn and Radix set `data-state`, so style it with `data-[state=open]:` variants. Do not toggle classes in JS to reflect state.
- Variants: `cva` lives in `components/ui/*`. A feature view with its own variants may use `cva` while one feature uses them. Move it to `components/` once two features need it.
- **Grid:** Tailwind's spacing scale is the baseline. The base is 4px (`--spacing: 0.25rem` at the default 16px root). Use `p-1`, `gap-2`, `h-8`, and so on. Arbitrary values (`p-[13px]`, `w-[360px]`) are not allowed in feature code. `check:spc` enforces this. If a value is a real design token, add it to `@theme` in `index.css` and use the utility.
- **Colour:** semantic tokens only (`bg-background`, `text-muted-foreground`, `border-border`, `bg-destructive`). No raw hex, no `oklch()`, no `rgb()` in views. Status colours use `text-success`/`bg-success`, `text-warning`/`bg-warning` and `text-info`/`bg-info`, defined in `index.css` for both themes.
- **Type:** Tailwind's `text-*` scale. Do not add arbitrary font sizes.
- **Inline `style`** only for data that changes at runtime (a measured width from a store, an accent colour from a project). Never for static values.
- **Icons:** `lucide-react`. Size with classes (`size-4`).
- **Dark mode:** the `dark` class on `<html>`, set by `state/theme-presenter.ts`. Views never read the theme. Components that need it (Pierre, Sonner) receive it as a prop from an owning host.

## Testing

- **Stores:** real instance. One `describe` per member. One `it` per branch.
- **Presenters:** mocked collaborators (`createMockInstance(IpcXService)`, real stores where practical). One guard per test. Assert IPC calls and store changes. Tests that cover listeners call `start()`, then `stop()`.
- **Views:** props in, markup out. Each named state gets one test. No clicks or submits in view tests. Interaction is covered by presenter tests. Snapshot with `viewMarkup()` when the markup is the contract.
- **No Storybook.** A view's test file renders the same named states a story would.
- **Not unit-tested:** `create.tsx` and `install.ts`. The mirror's ordering and revision gates are tested directly.
- Test names: the outer `describe` is the unit name. `it("can ... when ...")`.
- Runner: Vitest with jsdom. `pnpm test` runs once. Setup lives in `src/renderer/src/test/setup.ts`.

## Early returns

Guard failures first. The happy path is the last return, unindented. Do not nest the success case. Checks that share an outcome share one guard.

When several checks share an outcome, put them in one condition. `if (!chatId)` covers both `null` and `""`. A second guard is only for a different outcome.

Rule getters: each invalid case `return false`, then `return true`. Do not `return this.apiKey !== ""`.

```ts
get canSave(): boolean {
  if (this.busy || this.apiKey.trim().length === 0) {
    return false;
  }
  return true;
}
```

Presenters: `if (!this.store.canSave) { return; }` then the work. After IPC, bail on a missing result, then mutate.

Views: exclusive states (loading, error, empty, list) are early returns in a same-file helper, not `{!loading && error === null && items.length === 0 && ...}`. An optional extra on the same screen may stay a conditional.

---

## Examples

These examples are the contract in code. Comments mark **why**, not what the next line does. Copy the shape; do not invent a fourth layer.

Shared ports used below live in `state/`:

```ts
// state/app-deps.ts — what every feature create receives (abridged)
export type AppDeps = {
  services: Services;                       // ipc/services.ts
  env: { window: Window };                  // injected so presenters never touch globals
  mirror: { library: LibraryStore; meta: MetaStore; run: RunStore };
  shared: {
    layout: LayoutStore; layoutPresenter: LayoutPresenter;
    overlay: OverlayStore;
    panel: PanelStore; panelPresenter: PanelPresenter;
    theme: ThemeStore; themePresenter: ThemePresenter;
    commands: CommandRegistry;              // features register keyboard commands here
    composer: ComposerPort;                 // focus and fill the prompt box
    permissions: PermissionsStore; mcp: McpStore;
  };
};
```

### 1. Simple — OpenRouter key form

One form, one store, one presenter, no children. Teaches: `canSave` rule getter on the store, arrow methods, the presenter waits for the server instead of optimistic writes, and `observer` on the owning create.

```
ipc/settings-service/
  settings-service.ts
  fake-settings-service.ts
  install.ts
features/settings/openrouter-key/
  create.tsx
  openrouter-key.tsx
  openrouter-key.test.tsx
  openrouter-key-store/openrouter-key-store.ts
  openrouter-key-presenter/openrouter-key-presenter.ts
```

```ts
// openrouter-key-store/openrouter-key-store.ts
import { makeAutoObservable } from "mobx";

export class OpenRouterKeyStore {
  apiKey = "";
  busy = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  get canSave(): boolean {
    if (this.busy || this.apiKey.trim().length === 0) {
      return false;
    }
    return true;
  }

  setApiKey(value: string) {
    this.apiKey = value;
    this.error = null;
  }

  setBusy(value: boolean) {
    this.busy = value;
  }

  setError(message: string | null) {
    this.error = message;
  }

  clear() {
    this.apiKey = "";
    this.error = null;
  }
}
```

```ts
// openrouter-key-presenter/openrouter-key-presenter.ts
import type { SettingsService } from "@/ipc/settings-service/settings-service";
import type { OpenRouterKeyStore } from "@/features/settings/openrouter-key/openrouter-key-store/openrouter-key-store";

export class OpenRouterKeyPresenter {
  constructor(
    private readonly store: OpenRouterKeyStore,
    private readonly settings: SettingsService,
  ) {}

  handleApiKeyChange = (value: string) => {
    this.store.setApiKey(value);
  };

  handleSave = async () => {
    if (!this.store.canSave) {
      return;
    }

    this.store.setBusy(true);
    try {
      await this.settings.saveOpenRouterKey(this.store.apiKey.trim());
      // Do not mark the key as configured here. The meta event does that.
      this.store.clear();
    } catch (err) {
      this.store.setError(errorMessage(err));
    } finally {
      this.store.setBusy(false);
    }
  };
}
```

```tsx
// openrouter-key.tsx — hook-free, store-free, presenter-free
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type OpenRouterKeyProps = {
  apiKey: string;
  busy: boolean;
  canSave: boolean;
  error: string | null;
  onApiKeyChange: (value: string) => void;
  onSave: () => void;
};

export function OpenRouterKey({
  apiKey,
  busy,
  canSave,
  error,
  onApiKeyChange,
  onSave,
}: OpenRouterKeyProps) {
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <Label htmlFor="openrouter-key">OpenRouter API key</Label>
      <Input
        id="openrouter-key"
        type="password"
        value={apiKey}
        disabled={busy}
        onChange={(event) => onApiKeyChange(event.target.value)}
      />
      {error !== null && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={!canSave}>
        Save key
      </Button>
    </form>
  );
}
```

```tsx
// create.tsx — owning: called once at boot, returns observer
import { observer } from "mobx-react-lite";
import type { Services } from "@/ipc/services";
import { OpenRouterKey } from "./openrouter-key";
import { OpenRouterKeyPresenter } from "./openrouter-key-presenter/openrouter-key-presenter";
import { OpenRouterKeyStore } from "./openrouter-key-store/openrouter-key-store";

export function createOpenRouterKey({ services }: { services: Pick<Services, "settings"> }) {
  const store = new OpenRouterKeyStore();
  const presenter = new OpenRouterKeyPresenter(store, services.settings);

  return observer(function OpenRouterKeyHost() {
    return (
      <OpenRouterKey
        apiKey={store.apiKey}
        busy={store.busy}
        canSave={store.canSave}
        error={store.error}
        onApiKeyChange={presenter.handleApiKeyChange}
        onSave={presenter.handleSave}
      />
    );
  });
}
```

`openrouter-key.test.tsx` renders `<OpenRouterKey … />` with plain props, one test per named state (empty, busy, error). Store and presenter tests follow the rules above.

### 2. Medium — delete a chat with confirmation

A list (library) opens a confirmation. The confirmation's open state is on a store, so the view is controlled and has no state of its own. Teaches: dialog state on a store, pending target as data, and the presenter calls the service and does not touch the mirrored list.

```ts
// features/library/chat-deletion/chat-deletion-store/chat-deletion-store.ts
import { makeAutoObservable } from "mobx";
import type { ChatSummary } from "@shared/types";

export class ChatDeletionStore {
  target: ChatSummary | null = null;
  busy = false;

  constructor() {
    makeAutoObservable(this);
  }

  get open(): boolean {
    return this.target !== null;
  }

  get canConfirm(): boolean {
    if (this.busy || this.target === null) {
      return false;
    }
    return true;
  }

  setTarget(chat: ChatSummary | null) {
    this.target = chat;
  }

  setBusy(value: boolean) {
    this.busy = value;
  }
}
```

```ts
// chat-deletion-presenter/chat-deletion-presenter.ts
import type { ChatSummary } from "@shared/types";
import type { LibraryService } from "@/ipc/library-service/library-service";
import type { ChatDeletionStore } from "@/features/library/chat-deletion/chat-deletion-store/chat-deletion-store";

export class ChatDeletionPresenter {
  constructor(
    private readonly store: ChatDeletionStore,
    private readonly library: LibraryService,
  ) {}

  handleRequest = (chat: ChatSummary) => {
    this.store.setTarget(chat);
  };

  handleCancel = () => {
    if (this.store.busy) {
      return;
    }
    this.store.setTarget(null);
  };

  handleConfirm = async () => {
    if (!this.store.canConfirm || this.store.target === null) {
      return;
    }

    this.store.setBusy(true);
    try {
      await this.library.deleteChat(this.store.target.id);
      // The library event removes the row. Close the dialog after the call succeeds.
      this.store.setTarget(null);
    } finally {
      this.store.setBusy(false);
    }
  };
}
```

The dialog view takes `open`, `chatTitle`, `busy`, `onCancel`, `onConfirm` and renders the shadcn `AlertDialog`. The owning create passes `open={store.open}`. It does not compute anything else.

### 3. Complex — transcript rows

The transcript owns a list. The owning observer maps messages to **assemble** creates, so each row is an element. Rows are dumb. Teaches: mapping lives in the list owner, assemble creates return elements, and a stateful child comes in through a slot.

```
features/transcript/
  create.tsx                   # owning
  transcript.tsx               # view: takes rows as elements
  transcript-store/...         # reads run-store, owns scroll and jump state
  transcript-presenter/...
  message-row/
    create.tsx                 # assemble
    message-row.tsx            # dumb
```

```tsx
// message-row/create.tsx — assemble: no store, no presenter, no observer
import { MessageRow } from "./message-row";

export function createMessageRow({ key, message }: { key: string; message: ChatMessage }) {
  return <MessageRow key={key} message={message} />;
}
```

```tsx
// transcript/create.tsx — owning
export function createTranscript({ services, mirror, shared, review, question }: TranscriptDeps) {
  const store = new TranscriptStore();
  const presenter = new TranscriptPresenter(store, mirror.run, shared.composer, services.chat);

  return observer(function TranscriptHost() {
    // Mapping lives here: the list owner maps data to assemble elements.
    const rows = mirror.run.messages.map((message) => createMessageRow({ key: message.id, message }));
    return (
      <Transcript
        rows={rows}
        empty={mirror.run.messages.length === 0}
        Question={question}          // slot from the agent slice; never created here
        CommentableResponse={review.CommentableResponse}
        onJumped={presenter.handleJumped}
      />
    );
  });
}
```

Do **not** construct a store per row. Do **not** call an owning `create` inside the `map`. Do **not** put `rows` on a store.

### 4. Mirror — event subscription with revision gates

Subscriptions are the one place where `start()` and `stop()` matter. The mirror is started once at boot from the root. It keeps its disposer and ignores stale responses. The shape below shows the rule. Port the gates from `App.tsx` exactly (`App.tsx:143-211`), and keep the order: the transcript revision advances before the chat gate.

```ts
// mirror/mirror-presenter.ts (shape only)
export class MirrorPresenter {
  private unsubscribe: (() => void) | null = null;
  private transcriptRevision = 0;

  constructor(
    private readonly app: AppService,
    private readonly library: LibraryStore,
    private readonly meta: MetaStore,
    private readonly run: RunStore,
  ) {}

  start = () => {
    if (this.unsubscribe !== null) {
      return;
    }
    this.unsubscribe = this.app.onEvent(this.handleEvent);
    void this.loadSnapshot();
  };

  stop = () => {
    this.unsubscribe?.();
    this.unsubscribe = null;
  };

  handleEvent = (event: UiEvent) => {
    if (event.type === "transcript") {
      this.transcriptRevision += 1;
      if (event.chatId !== this.library.openChatId) {
        return;
      }
      this.run.setTranscript(event);
      return;
    }
    // ...library and meta follow the same pattern with their own revision counters
  };
}
```

### 5. Hook migration — resizable panel width

`useResizableWidth` held state, persisted to `localStorage`, and attached pointer listeners in an effect. Under SPC the state is a store field, persistence and listeners are in the presenter, and the view receives a press handler.

```ts
// state/layout-presenter.ts (shape only)
export class LayoutPresenter {
  private dragCleanup: (() => void) | null = null;

  constructor(
    private readonly store: LayoutStore,
    private readonly env: AppDeps["env"],
  ) {}

  handleResizeStart = (edge: "sidebar" | "diff", event: PointerEvent) => {
    event.preventDefault();
    const onMove = (move: PointerEvent) => this.store.setWidth(edge, this.clamp(edge, move.clientX));
    const onUp = () => this.endDrag();
    this.env.window.addEventListener("pointermove", onMove as EventListener);
    this.env.window.addEventListener("pointerup", onUp);
    this.dragCleanup = () => {
      this.env.window.removeEventListener("pointermove", onMove as EventListener);
      this.env.window.removeEventListener("pointerup", onUp);
    };
  };

  endDrag = () => {
    this.dragCleanup?.();
    this.dragCleanup = null;
  };

  stop = () => {
    this.endDrag();
  };
}
```

The `resize-handle` view receives `onPointerDown={(event) => onResizeStart(event)}`. It does not call any hook.

---

## App bootstrap (sketch)

```tsx
// src/renderer/src/create.tsx — root: builds everything once, then the shell
export function createApp(): ComponentType {
  const services = installServices();
  const mirror = createMirror(services);
  const shared = createSharedState(services, window);
  const deps: AppDeps = { services, env: { window }, mirror, shared };

  const agent = createAgent(deps);
  const review = createReview(deps);
  const runStatus = createRunStatus(deps);
  const composer = createComposer({ ...deps, review, runStatus });
  const transcript = createTranscript({ ...deps, review, question: agent.Question });
  const changes = createChanges({ ...deps, review });
  const library = createLibrary(deps);
  const settings = createSettings(deps);
  const models = createModels(deps);
  const Shell = createShell({ ...deps, slots: { ...library, ...settings, ...models, ...transcript, ...composer, ...changes } });

  mirror.start();
  shared.keyboard.start();
  shared.links.start();
  shared.themePresenter.start();

  return Shell;
}
```

`main.tsx` awaits nothing. It mounts the root host, which renders a loading state until the snapshot arrives. It does not construct stores or call `install`.

## AI checklist

- New feature → `src/renderer/src/features/<name>/` with an owning `create.tsx`.
- Used by two features → `components/` or `state/`.
- New IPC method → add it to the matching `ipc/<domain>-service/`, then the real class, the fake, and `Services`. Never call `window.slagent` from a feature.
- Server state? Do not write it locally. Call the service and wait for the event.
- Service call, DOM listener, clipboard, or timer? Presenter method (arrow), started and stopped in the presenter.
- Own-store pure one-liner? The presenter may assign the field. Injected store? Call a method.
- View takes a model when the owner would only unwrap fields. Formatted or derived values come as primitives from the owning store.
- Global keyboard shortcut? Register a command in `shared.commands`. Do not add a window-level `keydown` listener in a feature. An element's own `onKeyDown` (a card or a field handling its keys while it has focus) is a view prop and is fine.
- A hook in a view? Stop. Move the state to a store, the effect to a presenter, the ref to a callback ref, the context to props.
- Styling: Tailwind classes plus `cn()`. Spacing from the scale. Colours from tokens. No arbitrary values, no template-built classes, no CSS modules.
- Guard first, happy path last. Same outcome, one condition.
- Test per the Testing section. Not `create.tsx`.

## Updating these guidelines

Change this file when an existing rule is **wrong or too absolute**, not to document every one-off. Land the doc change in the **same change** as the first compliant example, or before it. Do not ship code that fights a written rule and promise to update the doc later.

When a rule change makes nearby sentences false (examples, checklist, layers table), fix those in the same pass.
