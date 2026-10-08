#!/bin/sh
# Installs the latest slagent release to ~/Applications/slagent.app:
#   curl -fsSL https://raw.githubusercontent.com/slavkobojanic/slagent/main/scripts/install.sh | sh
set -eu

base="https://github.com/slavkobojanic/slagent/releases/latest/download"
installed="$HOME/Applications/slagent.app"
legacy="/Applications/slagent.app"
lsregister=/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister

fail() {
  echo "slagent install: $*" >&2
  exit 1
}

# Everything runs from main so a truncated `curl | sh` download can't run half a script.
main() {
  [ "$(uname -s)" = Darwin ] || fail "slagent only runs on macOS"
  # uname -m says x86_64 under Rosetta, so ask the hardware instead.
  [ "$(sysctl -n hw.optional.arm64 2>/dev/null || true)" = 1 ] || fail "slagent only ships for Apple Silicon Macs"

  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT

  # The updater feed names the zip in the newest non-prerelease release, which saves a
  # call to the rate-limited GitHub API.
  curl -fsSL "$base/latest-mac.yml" -o "$tmp/latest-mac.yml" || fail "could not fetch the latest release"
  version="$(sed -n 's/^version: *//p' "$tmp/latest-mac.yml")"
  zip="$(sed -n 's/^path: *//p' "$tmp/latest-mac.yml")"
  [ -n "$version" ] && [ -n "$zip" ] || fail "could not read latest-mac.yml"

  current="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$installed/Contents/Info.plist" 2>/dev/null || true)"
  if [ "$current" = "$version" ]; then
    echo "slagent $version is already installed at $installed"
    exit 0
  fi

  echo "Downloading slagent $version..."
  curl -fL --progress-bar "$base/$zip" -o "$tmp/$zip" || fail "could not download $zip"
  curl -fsSL "$base/$zip.sha256" -o "$tmp/$zip.sha256" || fail "could not download $zip.sha256"
  (cd "$tmp" && shasum -a 256 -c "$zip.sha256" >/dev/null) || fail "$zip does not match its checksum"

  # ditto keeps the framework symlinks and the stapled signature intact; unzip does not.
  ditto -x -k "$tmp/$zip" "$tmp/app"
  [ -d "$tmp/app/slagent.app" ] || fail "$zip does not contain slagent.app"

  pkill -f "$installed/Contents/MacOS/" || true
  pkill -f "$legacy/Contents/MacOS/" || true
  # A second copy with the same bundle id confuses Launch Services and the privacy panes.
  if [ -d "$legacy" ]; then
    "$lsregister" -u "$legacy" || true
    rm -rf "$legacy" || echo "Could not remove $legacy. Delete it so macOS only sees one copy." >&2
  fi
  mkdir -p "$HOME/Applications"
  rm -rf "$installed"
  ditto "$tmp/app/slagent.app" "$installed"
  "$lsregister" -f "$installed"
  echo "Installed slagent $version to $installed"
}

main "$@"
