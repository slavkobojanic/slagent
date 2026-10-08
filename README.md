<!-- TODO: expand project docs -->
<p align="center">
  <img src="docs/icon.png" width="128" height="128" alt="slagent app icon">
</p>

<h1 align="center">slagent</h1>

A desktop coding agent for macOS, built on [Pi](https://github.com/earendil-works/pi). Open a folder, chat with an agent that reads, edits and runs code in it, and review, commit and push the result without leaving the app.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/slavkobojanic/slagent/main/scripts/install.sh | sh
```

This installs the latest release to `~/Applications/slagent.app`, replacing any older copy. To install by hand instead, download the latest `slagent-*-mac.zip` from [Releases](https://github.com/slavkobojanic/slagent/releases), unzip it and move `slagent.app` to `~/Applications` (the Applications folder in your home folder, not the system one). Builds are signed and notarized, and the app updates itself from new releases.

slagent currently ships for Apple Silicon Macs only.

## Getting started

1. Open slagent and choose a folder. Each folder becomes a project in the sidebar, with its own chats.
2. Pick a model:
   - **Claude models** run through Claude Code. Install it and sign in once by running `claude` in a terminal. slagent uses your own `claude` install when it finds one, and otherwise the copy bundled with the Claude Agent SDK.
   - **Every other model** runs through [OpenRouter](https://openrouter.ai). Add a key in **Settings → General**, or set `OPENROUTER_API_KEY` in your shell profile.
3. Ask for something.

### The `slagent` command

Go to **Settings → CLI** and click **Install command**. This puts a small script at `/usr/local/bin/slagent`, and macOS asks for your password to write it there. After that:

```bash
slagent .            # open the current folder as a project
slagent ~/code/app   # open another folder
slagent              # just bring up the app
```

The script finds the app by its bundle id, so it keeps working after you move or update the app. You can also drop a folder on the Dock icon, or use Finder's **Open With → slagent**.

## Features

- **Plan mode.** The agent explores and proposes a plan, which you approve before it changes anything.
- **Checkpoints and rewind.** The folder is snapshotted before every run, including untracked files. You can rewind the chat, the code or both to any earlier message, and undo the rewind.
- **Subagents.** The agent can hand self-contained tasks to helper agents that run in parallel. To add your own, put Markdown agent definitions in `~/.pi/agent/agents/` or in a project's `.pi/agents/`.
- **Background tasks.** Dev servers, watchers and slow test runs keep running in the background, and the agent can read their output or stop them.
- **Questions and to-dos.** The agent can stop to ask you a question, and keeps a task list you can follow as it works.
- **Computer use.** The agent can see and drive other Mac apps, one window at a time and without taking your focus. It needs the Accessibility and Screen Recording permissions, which the app walks you through.
- **MCP servers.** You can connect MCP servers, including ones that use OAuth sign-in, in **Settings → MCP**.
- **Git.** Review the diff for the last turn or all uncommitted changes, and commit, push and open a pull request (via `gh`) from the right panel.
- **Search and commands.** Search across every chat from the sidebar, mention files with `@`, and run slash commands from the composer or the command palette.

## How slagent works with Pi

Pi is a coding agent toolkit: an agent loop, tools, sessions, extensions and model providers, with its own terminal UI. slagent replaces that terminal UI with a desktop app.

**Pi is bundled.** slagent depends on Pi's npm packages (`@earendil-works/pi-coding-agent` and `@earendil-works/pi-mcp`) and runs Pi inside the app's own process. You don't need to install the `pi` CLI, and slagent doesn't use it even if you have it installed.

**Pi's config is shared.** slagent uses Pi's agent directory, `~/.pi/agent` (or `$PI_CODING_AGENT_DIR` if you set it). If you also use the `pi` CLI, both tools see the same:

| File in `~/.pi/agent` | Used for |
| --- | --- |
| `auth.json` | Provider credentials, including the OpenRouter key saved from Settings |
| `settings.json` | Pi's settings |
| `mcp.json` | Pi's own MCP servers, which also load into slagent chats |
| `mcp-auth.json` | MCP OAuth sign-ins |
| `agents/` | Custom subagents |

**What slagent adds.** Pi deliberately leaves features like plan mode, to-dos, subagents and checkpoints to extensions. slagent ships its own versions of these as Pi extensions in [`src/main/extensions`](src/main/extensions), designed for a GUI. For example, plans and questions appear as cards you click instead of text prompts in a terminal. Claude models go through the Claude Agent SDK instead of Pi, so they use your Claude Code subscription.

**What stays in slagent.** Projects, chats, attachments, app preferences and slagent's MCP server list are stored in `~/Library/Application Support/slagent`.

## Development

Requirements: macOS on Apple Silicon, Node 22.19 or later, pnpm 10, and the Xcode command line tools (the computer-use helper is written in Swift).

```bash
pnpm install
```

```bash
pnpm dev
```

`pnpm dev` runs the app with hot reload. `pnpm typecheck` checks the main, preload and renderer code.

`pnpm build:mac` builds the Swift helper and the app, signs it, and installs it to `~/Applications/slagent.app`. Signing is required (`forceCodeSigning`), so you need a code signing identity in your keychain. Releases are built by the [Release macOS app](.github/workflows/release-mac.yml) workflow, which signs and notarizes the app and publishes it with the update feed.

### Layout

| Path | What it is |
| --- | --- |
| `src/main` | Electron main process: the agent host, Pi and Claude runtimes, git, MCP, the CLI installer and the updater |
| `src/main/extensions` | Pi extensions slagent adds (plan mode, subagents, checkpoints and more) |
| `src/preload` | The bridge that exposes the `window.slagent` API to the UI |
| `src/renderer` | React UI |
| `src/shared` | Types and IPC channel names shared by every process |
| `native/computer` | Swift helper that reads and drives other apps for computer use |
