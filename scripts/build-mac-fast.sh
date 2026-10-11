#!/bin/sh
# Local iteration build. Same app as build-mac.sh but stops at the .app: no zip, no
# notarization, no install into ~/Applications (the ditto there rewrites ~1GB every time).
# Run the printed bundle directly.
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
