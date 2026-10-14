#!/bin/sh
# Derives the Android launcher icons and the splash mark from the raw square
# artwork in resources/icon.png, the same source the macOS and iOS icons come
# from. Android masks adaptive icons itself, so the foreground ships unrounded.
set -eu
root="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
res="$root/android/app/src/main/res"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# The adaptive icon canvas is 108dp with a 72dp visible circle, so the artwork is
# scaled to 70% and centred: the planet stays inside the safe zone on any mask,
# and the navy behind it is the colour sampled from the artwork's own edge.
swift "$root/scripts/round-icon.swift" "$root/resources/icon.png" "$tmp/foreground.png" 0.70 0
# The legacy icons are drawn as they ship, so their corners are baked in here.
swift "$root/scripts/round-icon.swift" "$root/resources/icon.png" "$tmp/legacy.png" 1 0.22
swift "$root/scripts/round-icon.swift" "$root/resources/icon.png" "$tmp/round.png" 1 0.5

# density: launcher legacy/round px, adaptive foreground px
for entry in mdpi:48:108 hdpi:72:162 xhdpi:96:216 xxhdpi:144:324 xxxhdpi:192:432; do
  density="${entry%%:*}"
  rest="${entry#*:}"
  launcher="${rest%%:*}"
  foreground="${rest#*:}"
  out="$res/mipmap-$density"
  mkdir -p "$out"
  sips -s format png -z "$launcher" "$launcher" "$tmp/legacy.png" --out "$out/ic_launcher.png" >/dev/null
  sips -s format png -z "$launcher" "$launcher" "$tmp/round.png" --out "$out/ic_launcher_round.png" >/dev/null
  sips -s format png -z "$foreground" "$foreground" "$tmp/foreground.png" --out "$out/ic_launcher_foreground.png" >/dev/null
done

# The splash draws the same mark as the icon, centred on the navy launch screen
# (res/drawable/splash.xml).
out="$res/drawable-xxxhdpi"
mkdir -p "$out"
cp "$res/mipmap-xxxhdpi/ic_launcher_foreground.png" "$out/splash_icon.png"
