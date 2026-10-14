#!/bin/sh
# The Android build: syncs the web bundle into android/ and assembles the debug
# APK you install on a phone with adb. This is `pnpm build:android`; the release
# workflow lives outside the repo.
set -eu
root="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$root"

# Capacitor 8 pins Gradle 8.14.3, which runs on Java 21 but rejects the Java 25
# the system JVM defaults to, so find a 21 when JAVA_HOME is not already set.
if [ -z "${JAVA_HOME:-}" ]; then
  for home in "$HOME"/.sdkman/candidates/java/21.* /Library/Java/JavaVirtualMachines/*/Contents/Home; do
    [ -x "$home/bin/java" ] || continue
    case "$("$home/bin/java" -version 2>&1)" in *'"21.'*) JAVA_HOME="$home"; break;; esac
  done
  export JAVA_HOME
fi
[ -n "${JAVA_HOME:-}" ] || { echo "No Java 21 found for Gradle; set JAVA_HOME." >&2; exit 1; }

pnpm mobile:build
pnpm exec cap sync android
cd android
./gradlew assembleDebug
echo "$root/android/app/build/outputs/apk/debug/app-debug.apk"
