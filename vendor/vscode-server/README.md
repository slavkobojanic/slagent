# vscode-server

slagent's editor is VS Code itself: the open source web server from [microsoft/vscode](https://github.com/microsoft/vscode)
(`reh-web`), built here with a small patch set and shown in an iframe in editor mode.

- `VERSION` the upstream tag we build.
- `patches/` changes to upstream source, applied in order by `build.sh`. Keep them small; each one is a rebase cost on upgrade.
- `product.overrides.json` Open VSX gallery and default settings (hidden chrome, no AI features, no telemetry).
- `extensions/slagent-bridge/` built-in extension the app uses to open files, run view commands and update settings.
- `finish.mjs` merges the overrides, removes extensions we do not ship and adds the bridge.
- `build.sh` produces `dist/<platform>-<arch>` (git-ignored).

```sh
NODE24_BIN=/path/to/node24/bin ./build.sh        # minified
MIN=0 NODE24_BIN=... ./build.sh                  # faster, larger
```

Upgrading: bump `VERSION`, run `build.sh`; fix any patch that no longer applies.
