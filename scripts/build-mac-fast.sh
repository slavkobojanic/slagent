#!/bin/sh
# The local build: same app as build-mac.sh but stops at the .app, with no zip and no
# install into ~/Applications (the ditto there rewrites ~1GB every time). Run the printed
# bundle directly. This is `pnpm build:mac`; build-mac.sh is `pnpm build:mac:release`.
set -eu
root="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$root"
sh "$root/scripts/build-computer.sh"
sh "$root/scripts/make-icon.sh"
pnpm exec electron-vite build
pnpm exec electron-builder --mac dir --publish never
app="$root/dist/mac-arm64/slagent.app"
if [ ! -d "$app" ]; then
  app="$root/dist/mac/slagent.app"
fi
echo "$app"
