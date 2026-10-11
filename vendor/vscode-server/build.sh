#!/usr/bin/env bash
# Builds the VS Code web server (Code - OSS "reh-web") with slagent's patches into dist/<platform>-<arch>.
#   NODE24_BIN  directory holding a Node 24+ binary (VS Code's build needs it)
#   PLATFORM / ARCH  default darwin / arm64
#   MIN=0       skip minification (faster, bigger)
#   CACHE       where the source clone lives (default .cache)
#   GITHUB_TOKEN  optional; avoids GitHub's rate limit when the build downloads bundled extensions
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
version="$(cat "$here/VERSION")"
platform="${PLATFORM:-darwin}"
arch="${ARCH:-arm64}"
cache="${CACHE:-$here/.cache}"
[ -n "${NODE24_BIN:-}" ] && export PATH="$NODE24_BIN:$PATH"

node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 24 ? 0 : 1)' || {
  echo "Node 24 or newer is required to build VS Code; set NODE24_BIN." >&2
  exit 1
}

mkdir -p "$cache"
src="$cache/vscode"
[ -d "$src/.git" ] || git clone --depth 1 --branch "$version" https://github.com/microsoft/vscode.git "$src"

cd "$src"
git checkout -q .
for patch in "$here"/patches/*.patch; do git apply "$patch"; done

export ELECTRON_SKIP_BINARY_DOWNLOAD=1 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
[ -d node_modules ] || npm ci

task="vscode-reh-web-$platform-$arch"
[ "${MIN:-1}" = "1" ] && task="$task-min"
npm run gulp "$task"

dist="$here/dist/$platform-$arch"
rm -rf "$dist"
mkdir -p "$dist"
cp -R "$cache/vscode-reh-web-$platform-$arch/." "$dist"
node "$here/finish.mjs" "$dist"
