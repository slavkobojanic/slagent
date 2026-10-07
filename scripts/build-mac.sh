#!/bin/sh
set -eu
root="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$root"
sh "$root/scripts/build-computer.sh"
mkdir -p "$root/build"
cp "$root/resources/slagent.app/Contents/Resources/icon.icns" "$root/build/icon.icns"
pnpm exec electron-vite build
# electron-builder owns signing from here: it imports the Developer ID from CSC_LINK,
# signs the app and the nested helper, notarizes when APPLE_* env vars are present,
# staples the ticket, then emits the zip and latest-mac.yml for the updater.
pnpm exec electron-builder --mac --publish never
app="$root/dist/mac-arm64/slagent.app"
if [ ! -d "$app" ]; then
  app="$root/dist/mac/slagent.app"
fi

# CI builds stop here; the release workflow publishes the signed bundle and latest-mac.yml.
if [ -n "${SLAGENT_NO_INSTALL:-}" ]; then
  echo "$app"
  exit 0
fi

installed="$HOME/Applications/slagent.app"
legacy="/Applications/slagent.app"
pkill -f "$installed/Contents/MacOS/" || true
pkill -f "$legacy/Contents/MacOS/" || true
# A second copy with the same bundle id confuses Launch Services and the privacy panes.
if [ -d "$legacy" ]; then
  /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -u "$legacy" || true
  rm -rf "$legacy"
fi
mkdir -p "$HOME/Applications"
rm -rf "$installed"
ditto "$app" "$installed"
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$installed"
echo "$installed"
