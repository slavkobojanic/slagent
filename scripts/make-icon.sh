#!/bin/sh
# Derives every shipped icon from the raw square artwork in resources/icon.png.
# macOS does not mask app icons, so the rounded corners are baked in here, then
# the full iconset is compiled into an icns for the main app and the helper.
set -eu
root="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

mkdir -p "$tmp/icon.iconset"
# Apple's Big Sur grid: 824pt body on a 1024pt canvas, 22.5% corner radius.
swift "$root/scripts/round-icon.swift" "$root/resources/icon.png" "$tmp/rounded.png" 0.8047 0.225
for size in 16 32 128 256 512; do
  sips -s format png -z "$size" "$size" "$tmp/rounded.png" --out "$tmp/icon.iconset/icon_${size}x${size}.png" >/dev/null
  sips -s format png -z $((size * 2)) $((size * 2)) "$tmp/rounded.png" --out "$tmp/icon.iconset/icon_${size}x${size}@2x.png" >/dev/null
done
iconutil -c icns "$tmp/icon.iconset" -o "$tmp/icon.icns"

mkdir -p "$root/build"
cp "$tmp/icon.icns" "$root/build/icon.icns"
cp "$tmp/icon.icns" "$root/resources/slagent.app/Contents/Resources/icon.icns"
# The main process calls app.dock.setIcon() with this at runtime, which would
# otherwise fall back to the raw square artwork and undo the baked mask.
cp "$tmp/rounded.png" "$root/resources/icon-rounded.png"
# The helper bundle is committed; refresh its seal after touching its Resources.
codesign --force --deep --sign - "$root/resources/slagent.app" 2>/dev/null
