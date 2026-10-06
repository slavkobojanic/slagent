#!/bin/sh
set -eu
root="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
app="$root/resources/Slagent Computer.app"
binary="$app/Contents/MacOS/slagent-computer"
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
codesign --force --sign - "$binary"
echo "$binary"
