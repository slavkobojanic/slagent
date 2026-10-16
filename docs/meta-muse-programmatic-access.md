# Meta Muse: programmatic access research

Question: can slagent drive a user's **Meta Muse** subscription the way it drives their Claude
Code install (see `src/main/claude-runtime.ts`)? Researched 2026-10 against primary sources.

## Verdict

**Yes — possible like Claude Code, and the shape is nearly identical.** Meta ships an official
terminal coding agent (`muse`), an official TypeScript SDK that spawns `muse serve` and drives an
agent loop over a documented protocol (MSP), and login-based auth billed to the Muse subscription —
no API key. Meta's own docs explicitly invite the "desktop app" integration we would be building.

## What Meta Muse is

- Meta's personal AI agent product with paid subscription tiers ("Muse subscriptions"),
  https://www.meta.com/help/subscriptions/1625680452306909/
- **Muse Code** is its terminal coding agent (the Claude Code analog). User manual:
  https://dev.meta.ai/docs/muse-code. Developer docs: https://meta-models.github.io/muse-code-sdk

## Official CLI

- Binary: `muse`. Install: `curl https://dev.meta.ai/install.sh | bash` puts a checksum-verified
  launcher in `~/.local/bin`. Source: SDK docs quickstart, "What you need".
- Analogous to `claude`: REPL in a repo, agentic loop (plan/edit/run/verify), MCP servers, skills,
  hooks, plugins. Secondary confirmation: SitePoint "Meta Muse Code: Getting Started with the
  Terminal Coding Agent" (Aug 2026) via https://engineered.at/articles/meta-muse-code-getting-started-with-the-terminal-coding-agent

## Official SDK (the Claude Agent SDK analog)

- npm **`@muse-code/sdk`** — "TypeScript SDK for the Muse Session Protocol (MSP): connect to a
  Muse Code session, drive turns, and fold the event stream." v1.4.10 (2026-10-16), MIT, zero
  runtime dependencies, ships its own TypeScript declarations. Maintainer `mjdouglas_meta`.
  https://registry.npmjs.org/@muse-code/sdk , https://github.com/meta-models/muse-code-sdk
- Python twin `muse-code-sdk` (+ `muse-code-msp` wire types) on PyPI.
- Status: **Developer Preview** — published pre-1.0-style with no stability promise; minor
  releases may change APIs. Docs are generated from the protocol schema and stamped with the
  same schema fingerprint a server reports in `initialize`.

## Protocol surface (MSP) — maps ~1:1 onto our ClaudeRuntime needs

From the quickstart and wire reference (https://meta-models.github.io/muse-code-sdk/1.4/):

- Spawn `muse serve` via `spawnMspConnection({ command: museBin, args: ["serve"], cwd })`, then a
  handshake `initialize({ clientInfo })` that returns `serverInfo`, `museHome`, session durability,
  and a schema fingerprint (mismatch is a warning, never an error).
- `session/start { workspaceRoot }` → `sessionId`; host pushes `session/started`.
- `turn/start { sessionId, input }` → ack with `turnId`; answer streams as notifications
  `item/started`, `item/delta`, `item/completed`, `turn/completed` (terminal: `completed`,
  `cancelled`, `failed`; failure carries `error.kind` — `authRequired` when credentials are missing).
- Permissions: host pushes `approval/requested` → `approval/decide { sessionId, approvalId,
  choiceId: "allow_once", ... }` → `approval/resolved`. Plus `session/setApprovalMode` and
  permission profiles.
- Model handling: `model/list` and `session/setModel` mid-session; `session/modelChanged`,
  `session/modelRouteUnserved` notifications.
- Usage: `usage/read`, `session/tokenUsage`, `session/contextUsage`, `usage/changed`.
- Resume/durability: `session/resume`, `readSessionDurability`, transcript folding, recorded
  conformance transcripts under `schema/msp/`.
- Extras beyond our Claude path: `turn/steer` and turn queueing, `userInput/*` (agent questions),
  `subagent/*`, `session/fork`, `session/compact`, `session/sideChat`, `todoListChanged`,
  plugins/skills/hooks/MCP management, `account/read` (subscription state).

## Authentication and billing

- Login-based: "A configured provider: run `muse` once and log in, or point your program's HOME at
  a profile that already has credentials. A host with no credentials fails every turn."
  (quickstart). The SDK can also drive `account/loginStart`/`loginCancel` itself.
- The subscription pays for programmatic use — demonstrated by the community ecosystem:
  - `opencode-muse-auth` (npm): "Muse Spark in opencode billed to the Muse Code monthly
    subscription (Meta device login, no API key)" — https://github.com/TheStreamCode/opencode-muse-auth
  - `pi-meta-muse-auth` (npm): "Meta Muse Code subscription authentication and Muse Spark models
    for Pi"; device-code OAuth via `/login`, verifies an active Muse Code subscription before
    enabling the provider — https://github.com/sadiksaifi/pi-meta-muse-auth
  - `pi-muse-msp` (npm): "Muse MSP provider extension for Pi" — https://github.com/jwise7/pi-muse-msp
  - ACP adapters for Zed/JetBrains and headless editors: `@brokkai/muse-acp`,
    `@bex-co/muse-code-acp` (both unofficial).
- No per-token API key is involved on this path.

## Caveats / open questions

1. **Developer Preview**: `@muse-code/sdk` minor releases may change APIs; pin the version.
2. **Exit code 5**: a host build with the experimental SDK tier switched off refuses to serve; may
   require enabling a setting on the user's install (quickstart, "exit classification").
3. **Model names**: query `model/list` at runtime instead of hardcoding a `MUSE_MODELS` list —
   better than our hardcoded `CLAUDE_MODELS`.
4. **Terms**: the docs invite editor/desktop-app integrations, but we have not reviewed the Muse
   terms of service for redistribution/bundling specifics.
5. `meta-models` GitHub org (created 2026-05) mirrors an upstream producing repo; npm maintainer
   is `mjdouglas_meta` and installer is served from dev.meta.ai — consistent with Meta-official,
   but the org is not under github.com/facebook.

## Mapping to slagent implementation (if we proceed)

Same checklist as discussed in chat, with the SDK replacing `query()`:

- `muse-runtime.ts` mirrors `claude-runtime.ts`: `spawnMspConnection` → `initialize` →
  `session/start`; `turn/start` per prompt; fold `item/*` into transcript messages;
  `approval/*` → question cards; `session/resume` with a stored `museSessionId`; zero cost on a
  subscription (cf. `claude-runtime.ts:783`).
- Binary discovery mirrors `findClaude()` (`claude-runtime.ts:1136`) for `~/.local/bin/muse`.
- `model/list` at startup drives the model picker dynamically.
