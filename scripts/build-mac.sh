#!/bin/sh
set -eu
root="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$root"
sh "$root/scripts/build-computer.sh"
mkdir -p "$root/build"
cp "$root/resources/slagent.app/Contents/Resources/icon.icns" "$root/build/icon.icns"
pnpm exec electron-vite build
CSC_IDENTITY_AUTO_DISCOVERY=false pnpm exec electron-builder --mac dir --publish never
app="$root/dist/mac-arm64/slagent.app"
if [ ! -d "$app" ]; then
  app="$root/dist/mac/slagent.app"
fi
# electron-builder leaves only Electron's linker signature (identifier "Electron", nothing sealed),
# which macOS privacy checks reject, so granted switches never apply. Sign the bundle inside out.
# A real identity keeps grants across rebuilds; an ad-hoc one ("-") resets them on every build.
identity="${SLAGENT_SIGN_IDENTITY:-}"
if [ -z "$identity" ]; then
  identity="$(security find-identity -v -p codesigning | awk -F'"' '/Apple Development|Developer ID Application/ { print $2; exit }')"
fi
if [ -z "$identity" ]; then
  identity="-"
fi
sign() {
  codesign --force --timestamp=none --sign "$identity" "$@"
}
for helper in "$app"/Contents/Frameworks/*.framework; do
  sign --deep "$helper"
done
for helper in "$app"/Contents/Frameworks/*.app; do
  sign --deep "$helper"
done
sign --identifier com.slagent.computer "$app/Contents/Resources/slagent.app"
sign --identifier com.slagent.app "$app"
codesign --verify --deep --strict "$app"

# CI builds stop here; the release workflow packages the signed bundle itself.
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
