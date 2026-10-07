#!/bin/sh
set -eu
root="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
app="$root/resources/slagent.app"
binary="$app/Contents/MacOS/slagent"
mkdir -p "$app/Contents/MacOS"
swiftc \
  -O \
  -target arm64-apple-macos14.0 \
  -parse-as-library \
  -framework ApplicationServices \
  -framework CoreGraphics \
  -framework AppKit \
  -framework Foundation \
  -framework ImageIO \
  -framework ScreenCaptureKit \
  -o "$binary" \
  "$root"/native/computer/*.swift

iconset="$(mktemp -d)/AppIcon.iconset"
mkdir -p "$iconset" "$app/Contents/Resources"
src="$root/resources/icon.png"
sips -z 16 16 "$src" --out "$iconset/icon_16x16.png" >/dev/null
sips -z 32 32 "$src" --out "$iconset/icon_16x16@2x.png" >/dev/null
sips -z 32 32 "$src" --out "$iconset/icon_32x32.png" >/dev/null
sips -z 64 64 "$src" --out "$iconset/icon_32x32@2x.png" >/dev/null
sips -z 128 128 "$src" --out "$iconset/icon_128x128.png" >/dev/null
sips -z 256 256 "$src" --out "$iconset/icon_128x128@2x.png" >/dev/null
sips -z 256 256 "$src" --out "$iconset/icon_256x256.png" >/dev/null
sips -z 512 512 "$src" --out "$iconset/icon_256x256@2x.png" >/dev/null
sips -z 512 512 "$src" --out "$iconset/icon_512x512.png" >/dev/null
sips -z 1024 1024 "$src" --out "$iconset/icon_512x512@2x.png" >/dev/null
iconutil -c icns "$iconset" -o "$app/Contents/Resources/icon.icns"
rm -rf "$(dirname "$iconset")"

codesign --force --sign - "$app"
echo "$app"
